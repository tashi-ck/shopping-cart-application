using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using static ShoppingCart.Application.DTOs.PaymentDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : AuthenticatedControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IOrderService _orderService;
        private readonly ICartRepository _cartRepository;
        private readonly ICartItemRepository _cartItemRepository;
        private readonly IProductRepository _productRepository;
        private readonly IConfiguration _configuration;

        public PaymentsController(
            IPaymentService paymentService, IOrderService orderService, IUserService userService,
            ICartRepository cartRepository, ICartItemRepository cartItemRepository,
            IProductRepository productRepository, IConfiguration configuration)
            : base(userService)
        {
            _paymentService = paymentService;
            _orderService = orderService;
            _cartRepository = cartRepository;
            _cartItemRepository = cartItemRepository;
            _productRepository = productRepository;
            _configuration = configuration;
        }

        [HttpPost("create-checkout-session")]
        public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateCheckoutSessionDto dto)
        {
            var userId = await GetCurrentUserIdAsync();

            var cart = await _cartRepository.GetByUserIdAsync(userId);
            if (cart is null)
                return BadRequest("Your cart is empty.");

            var cartItems = (await _cartItemRepository.GetAllForCartAsync(cart.CartId)).ToList();
            if (cartItems.Count == 0)
                return BadRequest("Your cart is empty.");

            var lineItems = cartItems
                .Select(ci => new CheckoutLineItem(ci.ProductId, ci.ProductName, ci.UnitPrice, ci.Quantity))
                .ToList();

            var frontendUrl = _configuration["Frontend:BaseUrl"];
            var successUrl = $"{frontendUrl}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}";
            var cancelUrl = $"{frontendUrl}/checkout";

            var session = await _paymentService.CreateCheckoutSessionAsync(
                userId, dto.ShippingAddress, lineItems, successUrl, cancelUrl,
                extraMetadata: new Dictionary<string, string> { { "mode", "cart" } });

            return Ok(new CheckoutSessionResponseDto(session.Url));
        }

        [HttpPost("create-buynow-checkout-session")]
        public async Task<IActionResult> CreateBuyNowCheckoutSession([FromBody] CreateBuyNowCheckoutSessionDto dto)
        {
            if (dto.Quantity <= 0)
                return BadRequest("Quantity must be greater than zero.");

            var userId = await GetCurrentUserIdAsync();

            var product = await _productRepository.GetByIdAsync(dto.ProductId);
            if (product is null)
                return BadRequest("Product not found.");

            if (product.StockQuantity < dto.Quantity)
                return BadRequest($"Only {product.StockQuantity} of {product.Name} available.");

            var lineItems = new List<CheckoutLineItem>
        {
            new(product.ProductId, product.Name, product.Price, dto.Quantity)
        };

            var frontendUrl = _configuration["Frontend:BaseUrl"];
            var successUrl = $"{frontendUrl}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}";
            var cancelUrl = $"{frontendUrl}/products/{dto.ProductId}";

            var session = await _paymentService.CreateCheckoutSessionAsync(
                userId, dto.ShippingAddress, lineItems, successUrl, cancelUrl,
                extraMetadata: new Dictionary<string, string>
                {
                { "mode", "buynow" },
                { "productId", dto.ProductId.ToString() },
                { "quantity", dto.Quantity.ToString() }
                });

            return Ok(new CheckoutSessionResponseDto(session.Url));
        }

        [HttpGet("confirm/{sessionId}")]
        public async Task<IActionResult> ConfirmPayment(string sessionId)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var order = await _orderService.CompletePaymentAsync(userId, sessionId);
                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
