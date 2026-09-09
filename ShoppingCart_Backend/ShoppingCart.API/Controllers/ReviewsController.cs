using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using static ShoppingCart.Application.DTOs.ReviewDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/products/{productId}/reviews")]
    public class ReviewsController : AuthenticatedControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService, IUserService userService) : base(userService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(int productId)
        {
            int? currentUserId = User.Identity?.IsAuthenticated == true
                ? await GetCurrentUserIdAsync()
                : null;

            var reviews = await _reviewService.GetReviewsForProductAsync(productId, currentUserId);
            return Ok(reviews);
        }

        [HttpGet("summary")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSummary(int productId)
        {
            var summary = await _reviewService.GetReviewSummaryAsync(productId);
            return Ok(summary);
        }

        [HttpGet("eligibility")]
        public async Task<IActionResult> GetEligibility(int productId)
        {
            var userId = await GetCurrentUserIdAsync();
            var eligibility = await _reviewService.GetEligibilityAsync(userId, productId);
            return Ok(eligibility);
        }

        [HttpPost]
        public async Task<IActionResult> CreateReview(int productId, [FromBody] CreateReviewDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var review = await _reviewService.CreateReviewAsync(userId, productId, dto);
                return Ok(review);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
