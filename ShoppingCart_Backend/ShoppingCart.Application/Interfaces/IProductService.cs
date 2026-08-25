using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ProductDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IProductService
    {
        Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? categoryId, string? search, string? sortBy, bool includeInactive = false);
        Task<ProductDto?> GetProductAsync(int productId);
        Task<ProductDto> CreateProductAsync(CreateProductDto dto);
        Task<bool> UpdateProductAsync(int productId, UpdateProductDto dto);
        Task<bool> DeleteProductAsync(int productId);
        Task<bool> SetProductActiveAsync(int productId, bool isActive);
    }
}
