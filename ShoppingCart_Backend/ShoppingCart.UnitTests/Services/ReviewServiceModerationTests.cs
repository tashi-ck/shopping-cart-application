using FluentAssertions;
using Moq;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Services;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ReviewDtos;

namespace ShoppingCart.UnitTests.Services
{
    public class ReviewServiceModerationTests
    {
        private readonly Mock<IReviewRepository> _reviewRepositoryMock = new();
        private readonly Mock<IOrderRepository> _orderRepositoryMock = new();
        private readonly Mock<IProductRepository> _productRepositoryMock = new();
        private readonly Mock<IContentModerationService> _moderationMock = new();
        private readonly ReviewService _service;

        public ReviewServiceModerationTests()
        {
            _service = new ReviewService(
                _reviewRepositoryMock.Object, _orderRepositoryMock.Object,
                _productRepositoryMock.Object, _moderationMock.Object);

            // Common setup shared by most tests: no existing review, order qualifies
            _reviewRepositoryMock.Setup(r => r.GetByUserAndProductAsync(1, 10)).ReturnsAsync((Review?)null);
            _reviewRepositoryMock.Setup(r => r.GetQualifyingOrderIdAsync(1, 10)).ReturnsAsync(99);
            _reviewRepositoryMock.Setup(r => r.CreateAsync(It.IsAny<Review>())).ReturnsAsync((Review r) => r);
        }

        [Fact]
        public async Task CreateReviewAsync_AiApproves_PublishesImmediately()
        {
            _moderationMock.Setup(m => m.ModerateReviewAsync("Great product!", 5))
                .ReturnsAsync(new ContentModerationResult(ModerationVerdict.Approve, "clean", 0.95, null, "heuristic"));

            var result = await _service.CreateReviewAsync(1, 10, new CreateReviewDto(5, "Great product!"));

            result.ModerationStatus.Should().Be("Approved");
            _reviewRepositoryMock.Verify(r => r.CreateAsync(
                It.Is<Review>(rv => rv.ModerationStatus == "Approved" && rv.ModeratedBy == "AI")), Times.Once);
        }

        [Fact]
        public async Task CreateReviewAsync_AiRejectsSpam_NeverPublishesButStillSaved()
        {
            _moderationMock.Setup(m => m.ModerateReviewAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(new ContentModerationResult(ModerationVerdict.Reject, "advertising", 0.95, null, "heuristic"));

            var result = await _service.CreateReviewAsync(1, 10, new CreateReviewDto(5, "buy cheap stuff at mysite.com"));

            result.ModerationStatus.Should().Be("Rejected");
            result.RejectionReason.Should().NotBeNullOrEmpty();

            // Rejected reviews are still persisted (so the author can see why), just never public
            _reviewRepositoryMock.Verify(r => r.CreateAsync(
                It.Is<Review>(rv => rv.ModerationStatus == "Rejected" && rv.RejectionReason != null)), Times.Once);
        }

        [Fact]
        public async Task CreateReviewAsync_AiFlagsAmbiguous_FallsIntoExistingAdminQueue()
        {
            _moderationMock.Setup(m => m.ModerateReviewAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(new ContentModerationResult(
                    ModerationVerdict.Flag, "suspicious", 0.4, "Sarcastic tone, unclear intent", "ai"));

            var result = await _service.CreateReviewAsync(
                1, 10, new CreateReviewDto(1, "yeah great, love waiting 3 weeks for a scratched box lol"));

            result.ModerationStatus.Should().Be("Pending");

            // Not yet moderated by a person — ModeratedBy stays null until an admin acts,
            // even though the AI already looked at it and left a reasoning note.
            _reviewRepositoryMock.Verify(r => r.CreateAsync(
                It.Is<Review>(rv => rv.ModeratedBy == null && rv.AiReasoning == "Sarcastic tone, unclear intent")),
                Times.Once);
        }

        [Fact]
        public async Task CreateReviewAsync_ModerationServiceThrows_FallsBackToPending_NeverBlocksSubmission()
        {
            _moderationMock.Setup(m => m.ModerateReviewAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ThrowsAsync(new HttpRequestException("timeout"));

            // Critical: an AI outage must never prevent a legitimate review from being submitted
            var result = await _service.CreateReviewAsync(1, 10, new CreateReviewDto(4, "Decent, does the job."));

            result.ModerationStatus.Should().Be("Pending");
            _reviewRepositoryMock.Verify(r => r.CreateAsync(
                It.Is<Review>(rv => rv.ModerationStatus == "Pending" && rv.ModeratedBy == null)), Times.Once);
        }

        [Fact]
        public async Task CreateReviewAsync_EmptyComment_StillCallsModerationButRatingOnlyIsClean()
        {
            // Even a rating-only review goes through moderation — the heuristic tier
            // short-circuits null/empty comments to "clean" with no AI call needed,
            // but that's an implementation detail of AiContentModerationService, not
            // something ReviewService should assume. This test only asserts ReviewService's
            // contract: whatever verdict comes back is respected.
            _moderationMock.Setup(m => m.ModerateReviewAsync(null, 4))
                .ReturnsAsync(new ContentModerationResult(ModerationVerdict.Approve, "clean", 1.0, null, "heuristic"));

            var result = await _service.CreateReviewAsync(1, 10, new CreateReviewDto(4, null));

            result.ModerationStatus.Should().Be("Approved");
        }

        [Fact]
        public async Task UpdateReviewAsync_ReModeratesOnEdit_CanFlipApprovedBackToRejected()
        {
            // Editing an already-approved review into something spammy should re-moderate,
            // not silently keep the old Approved status.
            _moderationMock.Setup(m => m.ModerateReviewAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(new ContentModerationResult(ModerationVerdict.Reject, "advertising", 0.9, null, "heuristic"));
            _reviewRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<Review>())).ReturnsAsync(true);

            var updated = await _service.UpdateReviewAsync(1, 42, new UpdateReviewDto(5, "check out my-store.com for deals"));

            updated.Should().BeTrue();
            _reviewRepositoryMock.Verify(r => r.UpdateAsync(
                It.Is<Review>(rv => rv.ReviewId == 42 && rv.ModerationStatus == "Rejected")), Times.Once);
        }

        [Fact]
        public async Task ModerateReviewAsync_AdminDecision_OverridesAiRegardlessOfPriorVerdict()
        {
            // This exercises the existing admin-moderation path (unchanged by this feature),
            // confirming it still works once AI moderation is wired into creation.
            _reviewRepositoryMock.Setup(r => r.ModerateAsync(7, "Approved", null)).ReturnsAsync(true);

            var result = await _service.ModerateReviewAsync(7, new ModerateReviewDto(true, null));

            result.Should().BeTrue();
            _reviewRepositoryMock.Verify(r => r.ModerateAsync(7, "Approved", null), Times.Once);
        }
    }
}
