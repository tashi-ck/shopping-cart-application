using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ProductDtos;

namespace ShoppingCart.Application.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        public ProductService(IProductRepository productRepository) => _productRepository = productRepository;

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? categoryId, string? search, string? sortBy, bool includeInactive = false)
        {
            var products = await _productRepository.GetAllAsync(categoryId, search, sortBy, includeInactive);
            return products.Select(MapToDto);
        }

        public async Task<ProductDto?> GetProductAsync(int productId)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            return product is null ? null : MapToDto(product);
        }

        public async Task<ProductDto> CreateProductAsync(CreateProductDto dto)
        {
            var product = new Product
            {
                CategoryId = dto.CategoryId,
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                StockQuantity = dto.StockQuantity,
                ImageUrl = dto.ImageUrl
            };

            var created = await _productRepository.CreateAsync(product);

            // CreateAsync's RETURNING clause doesn't include CategoryName (Products table has no such column),
            // so re-fetch via GetByIdAsync to get the joined category name for the response DTO.
            var withCategory = await _productRepository.GetByIdAsync(created.ProductId)
                ?? throw new InvalidOperationException("Failed to load newly created product.");

            return MapToDto(withCategory);
        }

        public Task<bool> UpdateProductAsync(int productId, UpdateProductDto dto)
        {
            var product = new Product
            {
                ProductId = productId,
                CategoryId = dto.CategoryId,
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                StockQuantity = dto.StockQuantity,
                ImageUrl = dto.ImageUrl
            };

            return _productRepository.UpdateAsync(product);
        }

        public Task<bool> DeleteProductAsync(int productId) =>
            _productRepository.DeleteAsync(productId);

        public Task<bool> SetProductActiveAsync(int productId, bool isActive) =>
            _productRepository.SetActiveAsync(productId, isActive);

        private static ProductDto MapToDto(ProductWithCategory p) => new(
            p.ProductId, p.CategoryId, p.CategoryName, p.Name, p.Description,
            p.Price, p.StockQuantity, p.ImageUrl, p.IsActive, p.CreatedAt, p.UpdatedAt
        );
    }
}
