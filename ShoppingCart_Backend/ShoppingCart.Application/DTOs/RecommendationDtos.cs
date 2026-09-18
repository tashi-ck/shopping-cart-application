using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class RecommendationDtos
    {
        public record SimilarProductDto(
            int ProductId,
            string Name,
            string CategoryName,
            decimal Price,
            int StockQuantity,
            string? ImageUrl,
            double Similarity
        );
    }
}
