using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using System.Text.Json;
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

        [HttpPost("guest-checkout-session")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateGuestCheckoutSession([FromBody] CreateGuestCheckoutSessionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("Email is required.");

            if (dto.Items is null || dto.Items.Count == 0)
                return BadRequest("Your cart is empty.");

            var lineItems = new List<CheckoutLineItem>();

            foreach (var item in dto.Items)
            {
                if (item.Quantity <= 0)
                    return BadRequest("Quantity must be greater than zero.");

                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product is null)
                    return BadRequest($"Product {item.ProductId} not found.");

                if (product.StockQuantity < item.Quantity)
                    return BadRequest($"Only {product.StockQuantity} of {product.Name} available.");

                lineItems.Add(new CheckoutLineItem(product.ProductId, product.Name, product.Price, item.Quantity));
            }

            var itemsJson = JsonSerializer.Serialize(
                dto.Items.Select(i => new GuestCheckoutItem(i.ProductId, i.Quantity)).ToList()
            );

            if (itemsJson.Length > 480) // Stripe's 500-char metadata value limit, with a safety margin
                return BadRequest("Too many different items for a single guest checkout. Please create an account, or reduce the number of items.");

            var frontendUrl = _configuration["Frontend:BaseUrl"];
            var successUrl = $"{frontendUrl}/checkout/guest-success?session_id={{CHECKOUT_SESSION_ID}}";
            var cancelUrl = $"{frontendUrl}{dto.CancelPath ?? "/cart"}";

            var session = await _paymentService.CreateCheckoutSessionAsync(
                userId: 0, // placeholder — never read, since mode is "guest"
                dto.ShippingAddress, lineItems, successUrl, cancelUrl,
                extraMetadata: new Dictionary<string, string>
                {
            { "mode", "guest" },
            { "guestEmail", dto.Email },
            { "items", itemsJson }
                });

            return Ok(new CheckoutSessionResponseDto(session.Url));
        }

        [HttpGet("guest-confirm/{sessionId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GuestConfirmPayment(string sessionId)
        {
            try
            {
                // Reuses the EXACT same public, no-ownership-check path your webhook already
                // uses — no logged-in identity exists here to compare against anyway.
                var order = await _orderService.CompletePaymentFromWebhookAsync(sessionId);
                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
