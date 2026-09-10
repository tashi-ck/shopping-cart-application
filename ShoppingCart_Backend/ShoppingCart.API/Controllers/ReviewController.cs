using Microsoft.AspNetCore.Authorization;
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

        [HttpPost("{id}/helpful")]
        public async Task<IActionResult> VoteHelpful(int id, [FromBody] VoteHelpfulDto dto)
        {
            var userId = await GetCurrentUserIdAsync();
            await _reviewService.VoteHelpfulAsync(userId, id, dto.IsHelpful);
            return NoContent();
        }

        [HttpDelete("{id}/helpful")]
        public async Task<IActionResult> RemoveVote(int id)
        {
            var userId = await GetCurrentUserIdAsync();
            await _reviewService.RemoveVoteAsync(userId, id);
            return NoContent();
        }

        [HttpGet("admin/pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingReviews()
        {
            var pending = await _reviewService.GetPendingReviewsAsync();
            return Ok(pending);
        }

        [HttpPut("admin/{id}/moderate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ModerateReview(int id, [FromBody] ModerateReviewDto dto)
        {
            try
            {
                var updated = await _reviewService.ModerateReviewAsync(id, dto);
                return updated ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
