using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class RecommendationDtos
    {
        public record SimilarProductDto(int ProductId, string Name, decimal Price, string? ImageUrl, double Similarity);
    }
}
