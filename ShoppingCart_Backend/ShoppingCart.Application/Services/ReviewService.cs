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

        public ReviewService(IReviewRepository reviewRepository, IOrderRepository orderRepository)
        {
            _reviewRepository = reviewRepository;
            _orderRepository = orderRepository;
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

            var review = new Review
            {
                ProductId = productId,
                UserId = userId,
                OrderId = qualifyingOrderId,
                Rating = dto.Rating,
                Comment = dto.Comment
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

            var review = new Review { ReviewId = reviewId, UserId = userId, Rating = dto.Rating, Comment = dto.Comment };
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

        public async Task<IEnumerable<PendingReviewDto>> GetPendingReviewsAsync()
        {
            var pending = await _reviewRepository.GetPendingReviewsAsync();
            return pending.Select(p => new PendingReviewDto(
                p.ReviewId, p.ProductId, p.ProductName,
                string.IsNullOrWhiteSpace(p.UserFirstName) ? "Anonymous" : $"{p.UserFirstName} {p.UserLastName}",
                p.Rating, p.Comment, p.CreatedAt
            ));
        }

        public async Task<bool> ModerateReviewAsync(int reviewId, ModerateReviewDto dto)
        {
            if (!dto.Approve && string.IsNullOrWhiteSpace(dto.RejectionReason))
                throw new InvalidOperationException("A rejection reason is required when declining a review.");

            var status = dto.Approve ? "Approved" : "Rejected";
            var reason = dto.Approve ? null : dto.RejectionReason;

            return await _reviewRepository.ModerateAsync(reviewId, status, reason);
        }

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
