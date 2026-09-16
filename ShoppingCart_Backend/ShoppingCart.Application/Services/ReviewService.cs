using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ReviewDtos;

namespace ShoppingCart.Application.Services
{
    public class ReviewService : IReviewService
    {
        private readonly IReviewRepository _reviewRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;
        private readonly IContentModerationService _moderationService;

        public ReviewService(
            IReviewRepository reviewRepository,
            IOrderRepository orderRepository,
            IProductRepository productRepository,
            IContentModerationService moderationService)
        {
            _reviewRepository = reviewRepository;
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _moderationService = moderationService;
        }

        public async Task<IEnumerable<ReviewDto>> GetReviewsForProductAsync(int productId, int? currentUserId)
        {
            var reviews = await _reviewRepository.GetForProductAsync(productId, currentUserId);
            var result = new List<ReviewDto>();

            foreach (var r in reviews)
            {
                bool? userVote = currentUserId.HasValue
                    ? await _reviewRepository.GetUserVoteAsync(r.ReviewId, currentUserId.Value)
                    : null;

                result.Add(MapToDto(r, currentUserId, userVote));
            }

            return result;
        }

        public async Task<ReviewSummaryDto> GetReviewSummaryAsync(int productId)
        {
            var (average, count, distribution) = await _reviewRepository.GetSummaryAsync(productId);
            return new ReviewSummaryDto(Math.Round(average, 1), count, distribution);
        }

        public async Task<ReviewEligibilityDto> GetEligibilityAsync(int userId, int productId)
        {
            var existing = await _reviewRepository.GetByUserAndProductAsync(userId, productId);
            if (existing is not null)
                return new ReviewEligibilityDto(CanReview: false, AlreadyReviewed: true, Reason: null);

            var qualifyingOrderId = await _reviewRepository.GetQualifyingOrderIdAsync(userId, productId);
            if (qualifyingOrderId is null)
                return new ReviewEligibilityDto(
                    CanReview: false, AlreadyReviewed: false,
                    Reason: "You can review this product once your order has been delivered.");

            return new ReviewEligibilityDto(CanReview: true, AlreadyReviewed: false, Reason: null);
        }

        public async Task<ReviewDto> CreateReviewAsync(int userId, int productId, CreateReviewDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
                throw new InvalidOperationException("Rating must be between 1 and 5.");

            var existing = await _reviewRepository.GetByUserAndProductAsync(userId, productId);
            if (existing is not null)
                throw new InvalidOperationException("You've already reviewed this product. Edit your existing review instead.");

            var qualifyingOrderId = await _reviewRepository.GetQualifyingOrderIdAsync(userId, productId)
                ?? throw new InvalidOperationException("You can review this product once your order has been delivered.");

            var moderation = await SafeModerateAsync(dto.Comment, dto.Rating);

            var review = new Review
            {
                ProductId = productId,
                UserId = userId,
                OrderId = qualifyingOrderId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                ModerationStatus = ToStatus(moderation.Verdict),
                RejectionReason = moderation.Verdict == ModerationVerdict.Reject
                    ? BuildCustomerFacingReason(moderation.Label)
                    : null,
                ModeratedBy = moderation.Verdict == ModerationVerdict.Flag ? null : "AI",
                AiModerationLabel = moderation.Label,
                AiConfidenceScore = moderation.Confidence,
                AiReasoning = moderation.Reasoning,
                AiModeratedAt = DateTime.UtcNow
            };

            var created = await _reviewRepository.CreateAsync(review);
            return new ReviewDto(
                created.ReviewId, "You", created.Rating, created.Comment, created.CreatedAt,
                IsOwn: true, IsVerifiedPurchase: true, HelpfulCount: 0, NotHelpfulCount: 0, UserVote: null,
                ModerationStatus: created.ModerationStatus, RejectionReason: created.RejectionReason
            );
        }

        public async Task<bool> UpdateReviewAsync(int userId, int reviewId, UpdateReviewDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
                throw new InvalidOperationException("Rating must be between 1 and 5.");

            // Re-moderate on every edit — an approved review shouldn't stay published
            // if it's edited into something that would've been rejected outright.
            var moderation = await SafeModerateAsync(dto.Comment, dto.Rating);

            var review = new Review
            {
                ReviewId = reviewId,
                UserId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                ModerationStatus = ToStatus(moderation.Verdict),
                RejectionReason = moderation.Verdict == ModerationVerdict.Reject
                    ? BuildCustomerFacingReason(moderation.Label)
                    : null,
                ModeratedBy = moderation.Verdict == ModerationVerdict.Flag ? null : "AI",
                AiModerationLabel = moderation.Label,
                AiConfidenceScore = moderation.Confidence,
                AiReasoning = moderation.Reasoning,
                AiModeratedAt = DateTime.UtcNow
            };

            return await _reviewRepository.UpdateAsync(review);
        }

        public Task<bool> DeleteReviewAsync(int userId, int reviewId) =>
            _reviewRepository.DeleteAsync(reviewId, userId);

        public async Task VoteHelpfulAsync(int userId, int reviewId, bool isHelpful) =>
            await _reviewRepository.UpsertHelpfulVoteAsync(reviewId, userId, isHelpful);

        public Task RemoveVoteAsync(int userId, int reviewId) =>
            _reviewRepository.RemoveHelpfulVoteAsync(reviewId, userId);

        public async Task<IEnumerable<ReviewableOrderItemDto>> GetReviewableItemsForOrderAsync(int userId, int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId, userId)
                ?? throw new InvalidOperationException("Order not found.");

            var items = await _orderRepository.GetItemsForOrderAsync(orderId);
            var result = new List<ReviewableOrderItemDto>();

            foreach (var item in items)
            {
                var existingReview = await _reviewRepository.GetByUserAndProductAsync(userId, item.ProductId);
                bool canReview = existingReview is null && order.FulfillmentStatus == "Delivered";

                result.Add(new ReviewableOrderItemDto(
                    item.ProductId, item.ProductName, item.ImageUrl,
                    canReview, existingReview is not null, existingReview?.ReviewId
                ));
            }

            return result;
        }

        public async Task<IEnumerable<AdminReviewListItemDto>> GetPendingReviewsAsync()
        {
            var pending = await _reviewRepository.GetPendingReviewsAsync();
            return pending.Select(p => new AdminReviewListItemDto(
                p.ReviewId, p.ProductId, p.ProductName,
                string.IsNullOrWhiteSpace(p.UserFirstName) ? "Anonymous" : $"{p.UserFirstName} {p.UserLastName}",
                p.Rating, p.Comment, p.ModerationStatus, p.CreatedAt,
                p.ModeratedBy, p.AiModerationLabel, p.AiConfidenceScore
            ));
        }

        public async Task<bool> ModerateReviewAsync(int reviewId, ModerateReviewDto dto)
        {
            if (!dto.Approve && string.IsNullOrWhiteSpace(dto.RejectionReason))
                throw new InvalidOperationException("A rejection reason is required when declining a review.");

            var status = dto.Approve ? "Approved" : "Rejected";
            var reason = dto.Approve ? null : dto.RejectionReason;

            // An admin decision always overrides whatever the AI decided, and is recorded as such.
            return await _reviewRepository.ModerateAsync(reviewId, status, reason);
        }

        public async Task<IEnumerable<AdminReviewListItemDto>> GetProcessedReviewsAsync()
        {
            var reviews = await _reviewRepository.GetProcessedReviewsAsync();
            return reviews.Select(r => new AdminReviewListItemDto(
                r.ReviewId, r.ProductId, r.ProductName,
                string.IsNullOrWhiteSpace(r.UserFirstName) ? "Anonymous" : $"{r.UserFirstName} {r.UserLastName}",
                r.Rating, r.Comment, r.ModerationStatus, r.CreatedAt,
                r.ModeratedBy, r.AiModerationLabel, r.AiConfidenceScore
            ));
        }


        public async Task<AdminReviewDetailDto?> GetReviewDetailForAdminAsync(int reviewId)
        {
            var review = await _reviewRepository.GetByIdWithUserAsync(reviewId);
            if (review is null) return null;

            var product = await _productRepository.GetByIdAsync(review.ProductId);

            return new AdminReviewDetailDto(
                review.ReviewId, review.ProductId, product?.Name ?? "Unknown product",
                review.UserId,
                string.IsNullOrWhiteSpace(review.UserFirstName) ? "Anonymous" : $"{review.UserFirstName} {review.UserLastName}",
                review.UserEmail,
                review.OrderId, review.Rating, review.Comment,
                review.ModerationStatus, review.RejectionReason,
                review.HelpfulCount, review.NotHelpfulCount,
                review.CreatedAt, review.UpdatedAt,
                review.ModeratedBy, review.AiModerationLabel, review.AiConfidenceScore, review.AiReasoning
            );
        }

        // Fail-open: any moderation-service failure (timeout, bad API key, provider outage)
        // becomes "Flag" (=> Pending), the same as today's default behavior. A moderation
        // outage must never block a legitimate review submission.
        private async Task<ContentModerationResult> SafeModerateAsync(string? comment, int rating)
        {
            try
            {
                return await _moderationService.ModerateReviewAsync(comment, rating);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Content moderation failed, falling back to manual review: {ex.Message}");
                return new ContentModerationResult(
                    ModerationVerdict.Flag, "suspicious", 0, "Moderation service unavailable", "none");
            }
        }

        private static string ToStatus(ModerationVerdict verdict) => verdict switch
        {
            ModerationVerdict.Approve => "Approved",
            ModerationVerdict.Reject => "Rejected",
            _ => "Pending"
        };

        private static string BuildCustomerFacingReason(string label) => label switch
        {
            "spam" or "advertising" => "This review appears to contain promotional content or links, which isn't allowed.",
            "abusive" or "hate_speech" => "This review contains language that violates our community guidelines.",
            _ => "This review didn't meet our content guidelines."
        };

        private static ReviewDto MapToDto(ReviewWithUser r, int? currentUserId, bool? userVote)
        {
            var reviewerName = string.IsNullOrWhiteSpace(r.UserFirstName)
                ? "Anonymous"
                : $"{r.UserFirstName} {r.UserLastName?[..1]}.";

            return new ReviewDto(
                r.ReviewId, reviewerName, r.Rating, r.Comment, r.CreatedAt,
                IsOwn: r.UserId == currentUserId, IsVerifiedPurchase: true,
                r.HelpfulCount, r.NotHelpfulCount, userVote,
                r.ModerationStatus, r.RejectionReason
            );
        }
    }
}
