using ShoppingCart.Application.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public record CheckoutSessionResult(string SessionId, string Url);
    public record PaymentSessionStatus(
        bool IsPaid, int UserId, string ShippingAddress,
        string Mode, int? ProductId, int? Quantity);

    public interface IPaymentService
    {
        Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        int userId, string shippingAddress, List<CheckoutLineItem> items,
        string successUrl, string cancelUrl, Dictionary<string, string>? extraMetadata = null);

        Task<PaymentSessionStatus> GetSessionStatusAsync(string sessionId);
        Task RefundAsync(string sessionId);
    }
}
