using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.UserDtos;

namespace ShoppingCart.API.Controllers
{
    [Authorize]
    public class AuthenticatedControllerBase : ControllerBase
    {
        private const string ClaimsNamespace = "https://shoppingcart-api/claims";
        private readonly IUserService _userService;

        protected AuthenticatedControllerBase(IUserService userService) => _userService = userService;

        private Auth0ProfileDto ExtractProfileFromToken()
        {
            var auth0Id = User.FindFirst("sub")?.Value
                ?? throw new InvalidOperationException("Token missing 'sub' claim.");

            var email = User.FindFirst($"{ClaimsNamespace}/email")?.Value ?? string.Empty;
            var firstName = User.FindFirst($"{ClaimsNamespace}/given_name")?.Value;
            var lastName = User.FindFirst($"{ClaimsNamespace}/family_name")?.Value;

            return new Auth0ProfileDto(auth0Id, email, firstName, lastName);
        }

        // Every write to Cart/Orders needs the LOCAL UserId, not the Auth0 sub string —
        // this resolves (and, if needed, creates) that local user in one call.
        protected async Task<int> GetCurrentUserIdAsync()
        {
            var profile = ExtractProfileFromToken();
            var user = await _userService.GetOrCreateUserAsync(profile);
            return user.UserId;
        }
    }
}
