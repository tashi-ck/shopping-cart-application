using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using Stripe;
using Stripe.Checkout;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Services
{
    public class StripePaymentService : IPaymentService
    {
        public async Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        int userId, string shippingAddress, List<CheckoutLineItem> items,
        string successUrl, string cancelUrl, Dictionary<string, string>? extraMetadata = null)
        {
            var metadata = new Dictionary<string, string>
            {
                { "userId", userId.ToString() },
                { "shippingAddress", shippingAddress },
                { "mode", "cart" } 
            };

            if (extraMetadata is not null)
            {
                foreach (var (key, value) in extraMetadata)
                    metadata[key] = value; // overwrites "mode" when Buy Now passes its own
            }

            var options = new SessionCreateOptions
            {
                Mode = "payment",
                SuccessUrl = successUrl,
                CancelUrl = cancelUrl,
                LineItems = items.Select(item => new SessionLineItemOptions
                {
                    Quantity = item.Quantity,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmount = (long)(item.UnitPrice * 100),
                        ProductData = new SessionLineItemPriceDataProductDataOptions { Name = item.ProductName }
                    }
                }).ToList(),
                Metadata = metadata
            };

            var service = new SessionService();
            var session = await service.CreateAsync(options);

            return new CheckoutSessionResult(session.Id, session.Url);
        }

        public async Task<PaymentSessionStatus> GetSessionStatusAsync(string sessionId)
        {
            var service = new SessionService();
            var session = await service.GetAsync(sessionId);

            var userId = int.Parse(session.Metadata["userId"]);
            var shippingAddress = session.Metadata["shippingAddress"];
            var mode = session.Metadata.GetValueOrDefault("mode", "cart");

            int? productId = session.Metadata.TryGetValue("productId", out var pid) ? int.Parse(pid) : null;
            int? quantity = session.Metadata.TryGetValue("quantity", out var qty) ? int.Parse(qty) : null;

            return new PaymentSessionStatus(session.PaymentStatus == "paid", userId, shippingAddress, mode, productId, quantity);
        }

        public async Task RefundAsync(string sessionId)
        {
            var sessionService = new Stripe.Checkout.SessionService();
            var session = await sessionService.GetAsync(sessionId);

            if (string.IsNullOrEmpty(session.PaymentIntentId))
                throw new InvalidOperationException("No payment found for this session — nothing to refund.");

            var refundService = new RefundService();
            await refundService.CreateAsync(new RefundCreateOptions
            {
                PaymentIntent = session.PaymentIntentId
            });
        }
    }
}
