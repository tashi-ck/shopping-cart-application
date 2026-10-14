using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.OnboardingDtos;
using static ShoppingCart.Application.DTOs.UserDtos;
using ShoppingCart.Application.Models;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : AuthenticatedControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService) : base(userService)
        {
            _userService = userService;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetOrSyncCurrentUser()
        {
            var userId = await GetCurrentUserIdAsync();
            var profile = await _userService.GetProfileByIdAsync(userId);
            return Ok(profile);
        }

        [HttpPost("onboarding")]
        public async Task<IActionResult> SubmitOnboarding([FromBody] SubmitOnboardingDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _userService.CompleteOnboardingAsync(userId, dto);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("me/preferences")]
        public async Task<IActionResult> GetMyPreferences()
        {
            var userId = await GetCurrentUserIdAsync();
            var preferences = await _userService.GetPreferencesAsync(userId);

            // Null means "never completed onboarding": return an empty shape so the
            // frontend can render the form without special-casing a 404.
            return Ok(preferences ?? new UserPreferences(new List<int>(), null, null, null));
        }

        [HttpPut("me/preferences")]
        public async Task<IActionResult> UpdateMyPreferences([FromBody] SubmitOnboardingDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _userService.CompleteOnboardingAsync(userId, dto);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllUsersForAdmin()
        {
            var users = await _userService.GetAllUsersForAdminAsync();
            return Ok(users);
        }

        [HttpPatch("admin/{id}/active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetUserActive(int id, [FromBody] SetUserActiveDto dto)
        {
            var currentUserId = await GetCurrentUserIdAsync();
            if (currentUserId == id && !dto.IsActive)
                return BadRequest("You can't deactivate your own account.");

            var updated = await _userService.SetUserActiveAsync(id, dto.IsActive);
            return updated ? NoContent() : NotFound();
        }

        [HttpDelete("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var currentUserId = await GetCurrentUserIdAsync();
            if (currentUserId == id)
                return BadRequest("You can't delete your own account.");

            try
            {
                var deleted = await _userService.DeleteUserAsync(id);
                return deleted ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
