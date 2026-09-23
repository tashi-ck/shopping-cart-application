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
        private readonly IUserRepository _userRepository;

        public ProductService(
            IProductRepository productRepository,
            IProductImageRepository productImageRepository,
            ILowStockAlertService lowStockAlertService,
            IUserRepository userRepository)
        {
            _productRepository = productRepository;
            _productImageRepository = productImageRepository;
            _lowStockAlertService = lowStockAlertService;
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? categoryId, string? search, string? sortBy, bool includeInactive = false)
        {
            var products = await _productRepository.GetAllAsync(categoryId, search, sortBy, includeInactive);
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

        // --- Personalized recommendations (new) ---
        public async Task<IEnumerable<ProductDto>> GetPersonalizedProductsAsync(int userId, int limit = 12)
        {
            var preferences = await _userRepository.GetPreferencesAsync(userId);

            // No onboarding data (or the user skipped) — fall back to newest active
            // products rather than showing an empty/blank section.
            if (preferences is null)
            {
                var newest = await _productRepository.GetAllAsync(sortBy: "newest");
                return newest.Take(limit).Select(p => MapToDto(p, new List<ProductImageDto>()));
            }

            var allProducts = (await _productRepository.GetAllAsync()).ToList();

            var scored = allProducts
                .Select(p =>
                {
                    double score = 0;

                    if (preferences.PreferredCategoryIds.Contains(p.CategoryId))
                        score += 3;

                    var withinBudget =
                        (preferences.MinBudget is null || p.Price >= preferences.MinBudget) &&
                        (preferences.MaxBudget is null || p.Price <= preferences.MaxBudget);
                    if (withinBudget)
                        score += 2;

                    // Small tiebreak nudge based on the stated shopping priority —
                    // never overrides the category/budget match, just orders within it.
                    score += preferences.ShoppingPriority switch
                    {
                        "Price" => (double)(2000m - Math.Min(p.Price, 2000m)) / 2000.0,
                        "Trending" => Math.Max(0, 1 - (DateTime.UtcNow - p.CreatedAt).TotalDays / 365.0),
                        _ => 0
                    };

                    return (Product: p, Score: score);
                })
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Product.Name)
                .Take(limit)
                .Select(x => x.Product);

            return scored.Select(p => MapToDto(p, new List<ProductImageDto>()));
        }

        private static ProductDto MapToDto(ProductWithCategory p, List<ProductImageDto> images) => new(
            p.ProductId, p.CategoryId, p.CategoryName, p.Name, p.Description,
            p.Price, p.StockQuantity, p.ImageUrl, p.IsActive, p.CreatedAt, p.UpdatedAt,
            images
        );
    }
}
