using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class ReviewDtos
    {
        public record ReviewDto(
            int ReviewId,
            string ReviewerName,
            int Rating,
            string? Comment,
            DateTime CreatedAt,
            bool IsOwn
        );

        public record CreateReviewDto(int Rating, string? Comment);

        public record UpdateReviewDto(int Rating, string? Comment);

        public record ReviewSummaryDto(double AverageRating, int ReviewCount);

        public record ReviewEligibilityDto(bool CanReview, bool AlreadyReviewed, string? Reason);
    }
}
