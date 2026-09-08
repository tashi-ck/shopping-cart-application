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
        private readonly IProductImageRepository _productImageRepository;
        private readonly ILowStockAlertService _lowStockAlertService;
        public ProductService(
            IProductRepository productRepository,
            IProductImageRepository productImageRepository,
            ILowStockAlertService lowStockAlertService)
        {
            _productRepository = productRepository;
            _productImageRepository = productImageRepository;
            _lowStockAlertService = lowStockAlertService;
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? categoryId, string? search, string? sortBy, bool includeInactive = false)
        {
            var products = await _productRepository.GetAllAsync(categoryId, search, sortBy, includeInactive);
            // Gallery images intentionally NOT fetched here — the product grid only ever
            // shows the single thumbnail (Products.ImageUrl); fetching every product's full
            // gallery on every listing request would be a needless N+1 query pattern.
            return products.Select(p => MapToDto(p, new List<ProductImageDto>()));
        }

        public async Task<ProductDto?> GetProductAsync(int productId)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product is null) return null;

            var images = await _productImageRepository.GetAllForProductAsync(productId);
            var imageDtos = images.Select(i => new ProductImageDto(i.ProductImageId, i.ImageUrl, i.DisplayOrder)).ToList();

            return MapToDto(product, imageDtos);
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

            var withCategory = await _productRepository.GetByIdAsync(created.ProductId)
                ?? throw new InvalidOperationException("Failed to load newly created product.");

            return MapToDto(withCategory, new List<ProductImageDto>());
        }

        public async Task<bool> UpdateProductAsync(int productId, UpdateProductDto dto)
        {
            var existing = await _productRepository.GetByIdAsync(productId)
                ?? throw new InvalidOperationException("Product not found.");

            var previousStock = existing.StockQuantity;

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

            var updated = await _productRepository.UpdateAsync(product);

            if (updated)
            {
                await _lowStockAlertService.CheckAndNotifyAsync(productId, dto.Name, previousStock, dto.StockQuantity);
            }

            return updated;
        }

        public Task<bool> DeleteProductAsync(int productId) =>
            _productRepository.DeleteAsync(productId);

        public Task<bool> SetProductActiveAsync(int productId, bool isActive) =>
            _productRepository.SetActiveAsync(productId, isActive);

        public async Task<ProductImageDto> AddProductImageAsync(int productId, AddProductImageDto dto)
        {
            var product = await _productRepository.GetByIdAsync(productId)
                ?? throw new InvalidOperationException("Product not found.");

            var image = await _productImageRepository.CreateAsync(new ProductImage
            {
                ProductId = productId,
                ImageUrl = dto.ImageUrl
            });

            return new ProductImageDto(image.ProductImageId, image.ImageUrl, image.DisplayOrder);
        }

        public Task<bool> DeleteProductImageAsync(int productId, int productImageId) =>
            _productImageRepository.DeleteAsync(productImageId, productId);

        public Task ReorderProductImagesAsync(int productId, ReorderProductImagesDto dto) =>
            _productImageRepository.ReorderAsync(productId, dto.ProductImageIds);

        private static ProductDto MapToDto(ProductWithCategory p, List<ProductImageDto> images) => new(
            p.ProductId, p.CategoryId, p.CategoryName, p.Name, p.Description,
            p.Price, p.StockQuantity, p.ImageUrl, p.IsActive, p.CreatedAt, p.UpdatedAt,
            images
        );
    }
}
