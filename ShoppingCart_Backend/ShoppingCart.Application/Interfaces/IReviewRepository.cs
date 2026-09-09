using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IReviewRepository
    {
        Task<int?> GetQualifyingOrderIdAsync(int userId, int productId);
        Task<Review?> GetByUserAndProductAsync(int userId, int productId);
        Task<Review> CreateAsync(Review review);
        Task<bool> UpdateAsync(Review review);
        Task<bool> DeleteAsync(int reviewId, int userId);
        Task<IEnumerable<ReviewWithUser>> GetForProductAsync(int productId);
        Task<(double AverageRating, int ReviewCount)> GetSummaryAsync(int productId);
    }
}
