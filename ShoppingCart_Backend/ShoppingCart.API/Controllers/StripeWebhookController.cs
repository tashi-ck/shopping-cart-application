using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using Stripe;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/payments/webhook")]
    public class StripeWebhookController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StripeWebhookController> _logger;

        public StripeWebhookController(IOrderService orderService, IConfiguration configuration, ILogger<StripeWebhookController> logger)
        {
            _orderService = orderService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> HandleWebhook()
        {
            // Must read the RAW body, not a bound DTO — Stripe's signature is computed
            // over the exact bytes sent, so any JSON re-serialization would invalidate it.
            var json = await new StreamReader(Request.Body).ReadToEndAsync();
            var signatureHeader = Request.Headers["Stripe-Signature"];
            var webhookSecret = _configuration["Stripe:WebhookSecret"];

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);
            }
            catch (StripeException ex)
            {
                // Signature didn't match — this request either isn't genuinely from Stripe,
                // or the WebhookSecret in config doesn't match what "stripe listen" printed.
                _logger.LogWarning("Stripe webhook signature verification failed: {Message}", ex.Message);
                return BadRequest();
            }

            if (stripeEvent.Type == "checkout.session.completed")
            {
                var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                if (session is not null)
                {
                    try
                    {
                        await _orderService.CompletePaymentFromWebhookAsync(session.Id);
                    }
                    catch (InvalidOperationException ex)
                    {
                        _logger.LogError(ex, "Failed to process webhook for session {SessionId}", session.Id);
                        return StatusCode(500);
                    }
                }
            }
            else if (stripeEvent.Type == "charge.refunded")
            {
                var charge = stripeEvent.Data.Object as Charge;
                if (charge?.PaymentIntentId is not null)
                {
                    await _orderService.HandleRefundWebhookAsync(charge.PaymentIntentId);
                }
            }

            return Ok();
        }
    }
}
