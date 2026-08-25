using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.CartDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : AuthenticatedControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService, IUserService userService) : base(userService)
        {
            _cartService = cartService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var userId = await GetCurrentUserIdAsync();
            var cart = await _cartService.GetCartAsync(userId);
            return Ok(cart);
        }

        [HttpPost("items")]
        public async Task<IActionResult> AddItem([FromBody] AddCartItemDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var cart = await _cartService.AddItemAsync(userId, dto);
                return Ok(cart);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("items/{cartItemId}")]
        public async Task<IActionResult> UpdateItemQuantity(int cartItemId, [FromBody] UpdateCartItemQuantityDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var updated = await _cartService.UpdateItemQuantityAsync(userId, cartItemId, dto.Quantity);
                if (!updated) return NotFound();

                var cart = await _cartService.GetCartAsync(userId);
                return Ok(cart);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("items/{cartItemId}")]
        public async Task<IActionResult> RemoveItem(int cartItemId)
        {
            var userId = await GetCurrentUserIdAsync();
            var removed = await _cartService.RemoveItemAsync(userId, cartItemId);
            if (!removed) return NotFound();

            var cart = await _cartService.GetCartAsync(userId);
            return Ok(cart);
        }
    }
}
