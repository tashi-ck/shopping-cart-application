using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class ProductDtos
    {
        public record ProductDto(
            int ProductId,
            int CategoryId,
            string CategoryName,
            string Name,
            string? Description,
            decimal Price,
            int StockQuantity,
            string? ImageUrl,
            bool IsActive,
            DateTime CreatedAt,
            DateTime UpdatedAt
        );

        public record CreateProductDto(
            int CategoryId,
            string Name,
            string? Description,
            decimal Price,
            int StockQuantity,
            string? ImageUrl
        );

        public record UpdateProductDto(
            int CategoryId,
            string Name,
            string? Description,
            decimal Price,
            int StockQuantity,
            string? ImageUrl
        );

        public record SetProductActiveDto(bool IsActive);
    }
}
