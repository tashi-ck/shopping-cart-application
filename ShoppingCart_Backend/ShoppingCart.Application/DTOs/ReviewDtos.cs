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
            bool IsOwn,
            bool IsVerifiedPurchase,
            int HelpfulCount,
            int NotHelpfulCount,
            bool? UserVote,
            string ModerationStatus,   // "Pending" | "Approved" | "Rejected" — only meaningful when IsOwn is true
            string? RejectionReason
        );

        public record CreateReviewDto(int Rating, string? Comment);

        public record UpdateReviewDto(int Rating, string? Comment);

        public record VoteHelpfulDto(bool IsHelpful);

        public record ReviewSummaryDto(double AverageRating, int ReviewCount, Dictionary<int, int> Distribution);

        public record ReviewEligibilityDto(bool CanReview, bool AlreadyReviewed, string? Reason);

        // Powers the "My Orders" entry point — one row per distinct product in a delivered order
        public record ReviewableOrderItemDto(int ProductId, string ProductName, string? ImageUrl, bool CanReview, bool AlreadyReviewed, int? ReviewId);

        // Admin moderation queue
        public record PendingReviewDto(
            int ReviewId, int ProductId, string ProductName, string ReviewerName,
            int Rating, string? Comment, DateTime CreatedAt
        );

        public record ModerateReviewDto(bool Approve, string? RejectionReason);
    }
}
