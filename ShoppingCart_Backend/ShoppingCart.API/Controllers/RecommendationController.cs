using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/products")]
    public class RecommendationController : ControllerBase
    {
        private readonly IRecommendationService _recommendationService;
        public RecommendationController(IRecommendationService recommendationService) => _recommendationService = recommendationService;

        [HttpGet("{productId}/similar")]
        public async Task<IActionResult> GetSimilarProducts(int productId, [FromQuery] int limit = 10)
        {
            var products = await _recommendationService.GetSimilarProductsAsync(productId, limit);
            return Ok(products);
        }
    }
}
