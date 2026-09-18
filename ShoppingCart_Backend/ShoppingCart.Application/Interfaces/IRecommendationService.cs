using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.RecommendationDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IRecommendationService
    {
        Task<IEnumerable<SimilarProductDto>> GetSimilarProductsAsync(int productId, int limit = 10);
    }
}
