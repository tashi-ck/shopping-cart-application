using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ReviewDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IReviewService
    {
        Task<IEnumerable<ReviewDto>> GetReviewsForProductAsync(int productId, int? currentUserId);
        Task<ReviewSummaryDto> GetReviewSummaryAsync(int productId);
        Task<ReviewEligibilityDto> GetEligibilityAsync(int userId, int productId);
        Task<ReviewDto> CreateReviewAsync(int userId, int productId, CreateReviewDto dto);
        Task<bool> UpdateReviewAsync(int userId, int reviewId, UpdateReviewDto dto);
        Task<bool> DeleteReviewAsync(int userId, int reviewId);
    }
}
