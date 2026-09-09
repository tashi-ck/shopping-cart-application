using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.ReviewDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/reviews")]
    public class ReviewController : AuthenticatedControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewController(IReviewService reviewService, IUserService userService) : base(userService)
        {
            _reviewService = reviewService;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReview(int id, [FromBody] UpdateReviewDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var updated = await _reviewService.UpdateReviewAsync(userId, id, dto);
                return updated ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var userId = await GetCurrentUserIdAsync();
            var deleted = await _reviewService.DeleteReviewAsync(userId, id);
            return deleted ? NoContent() : NotFound();
        }
    }
}
