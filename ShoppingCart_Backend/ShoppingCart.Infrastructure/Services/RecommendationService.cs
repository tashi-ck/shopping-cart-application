using Microsoft.Extensions.Configuration;
using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.RecommendationDtos;

namespace ShoppingCart.Infrastructure.Services
{
    public class RecommendationService : IRecommendationService
    {
        private readonly HttpClient _httpClient;
        private readonly IProductRepository _productRepository;
        private readonly string _baseUrl;

        public RecommendationService(HttpClient httpClient, IProductRepository productRepository, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _productRepository = productRepository;
            _baseUrl = configuration["Recommendations:BaseUrl"] ?? "http://localhost:8001";
        }

        public async Task<IEnumerable<SimilarProductDto>> GetSimilarProductsAsync(int productId, int limit = 10)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<PythonRecommendationResponse>(
                    $"{_baseUrl}/recommendations/products/{productId}?limit={limit}");

                if (response is null || response.Recommendations.Count == 0)
                    return Enumerable.Empty<SimilarProductDto>();

                var results = new List<SimilarProductDto>();

                foreach (var rec in response.Recommendations)
                {
                    var product = await _productRepository.GetByIdAsync(rec.ProductId);

                    // Filter here, not in Python — this keeps "what counts as available"
                    // as a business rule your .NET layer owns, not duplicated logic.
                    if (product is null || !product.IsActive || product.StockQuantity <= 0)
                        continue;

                    results.Add(new SimilarProductDto(product.ProductId, product.Name, product.Price, product.ImageUrl, rec.Similarity));
                }

                return results;
            }
            catch (HttpRequestException)
            {
                // The recommendation service being down should never break the product page —
                // an empty result triggers the fallback (Step C), not an error shown to the customer.
                return Enumerable.Empty<SimilarProductDto>();
            }
        }

        private record PythonRecommendationResponse(int ProductId, List<PythonRecommendation> Recommendations);
        private record PythonRecommendation(int ProductId, double Similarity);
    }
}
