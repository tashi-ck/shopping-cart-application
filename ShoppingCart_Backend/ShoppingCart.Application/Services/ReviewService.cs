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
        public ReviewService(IReviewRepository reviewRepository) => _reviewRepository = reviewRepository;

        public async Task<IEnumerable<ReviewDto>> GetReviewsForProductAsync(int productId, int? currentUserId)
        {
            var reviews = await _reviewRepository.GetForProductAsync(productId);
            return reviews.Select(r => MapToDto(r, currentUserId));
        }

        public async Task<ReviewSummaryDto> GetReviewSummaryAsync(int productId)
        {
            var (average, count) = await _reviewRepository.GetSummaryAsync(productId);
            return new ReviewSummaryDto(Math.Round(average, 1), count);
        }

        public async Task<ReviewEligibilityDto> GetEligibilityAsync(int userId, int productId)
        {
            var existing = await _reviewRepository.GetByUserAndProductAsync(userId, productId);
            if (existing is not null)
                return new ReviewEligibilityDto(CanReview: false, AlreadyReviewed: true, Reason: null);

            var qualifyingOrderId = await _reviewRepository.GetQualifyingOrderIdAsync(userId, productId);
            if (qualifyingOrderId is null)
                return new ReviewEligibilityDto(CanReview: false, AlreadyReviewed: false, Reason: "You can only review products you've purchased.");

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
                ?? throw new InvalidOperationException("You can only review products you've purchased.");

            var review = new Review
            {
                ProductId = productId,
                UserId = userId,
                OrderId = qualifyingOrderId,
                Rating = dto.Rating,
                Comment = dto.Comment
            };

            var created = await _reviewRepository.CreateAsync(review);
            return new ReviewDto(created.ReviewId, "You", created.Rating, created.Comment, created.CreatedAt, IsOwn: true);
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

        private static ReviewDto MapToDto(ReviewWithUser r, int? currentUserId)
        {
            var reviewerName = string.IsNullOrWhiteSpace(r.UserFirstName)
                ? "Anonymous"
                : $"{r.UserFirstName} {r.UserLastName?[..1]}."; // "Sarah T." style — first name + last initial, matches common review UI privacy norms

            return new ReviewDto(r.ReviewId, reviewerName, r.Rating, r.Comment, r.CreatedAt, r.UserId == currentUserId);
        }
    }
}
