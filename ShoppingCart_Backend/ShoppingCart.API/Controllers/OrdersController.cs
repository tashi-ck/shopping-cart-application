using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.OrderDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : AuthenticatedControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService, IUserService userService) : base(userService)
        {
            _orderService = orderService;
        }

        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            var userId = await GetCurrentUserIdAsync();
            var orders = await _orderService.GetOrdersForUserAsync(userId);
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrder(int id)
        {
            var userId = await GetCurrentUserIdAsync();
            var order = await _orderService.GetOrderAsync(userId, id);
            return order is null ? NotFound() : Ok(order);
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> CheckoutCart([FromBody] CheckoutDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var order = await _orderService.CheckoutCartAsync(userId, dto);
                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("buy-now")]
        public async Task<IActionResult> BuyNow([FromBody] BuyNowDto dto)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var order = await _orderService.BuyNowAsync(userId, dto);
                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllOrdersForAdmin()
        {
            var orders = await _orderService.GetAllOrdersForAdminAsync();
            return Ok(orders);
        }

        [HttpPut("admin/{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateFulfillmentStatus(int id, [FromBody] UpdateOrderFulfillmentStatusDto dto)
        {
            try
            {
                var updated = await _orderService.UpdateFulfillmentStatusAsync(id, dto.FulfillmentStatus);
                return updated ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var order = await _orderService.CancelOrderAsync(userId, id);
                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOrderForAdmin(int id)
        {
            var order = await _orderService.GetOrderForAdminAsync(id);
            return order is null ? NotFound() : Ok(order);
        }

        [HttpDelete("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var deleted = await _orderService.DeleteOrderAsync(id);
            return deleted ? NoContent() : NotFound();
        }
    }
}
