using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.OrderDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IOrderService
    {
        Task<OrderDto> CheckoutCartAsync(int userId, CheckoutDto dto);
        Task<OrderDto> BuyNowAsync(int userId, BuyNowDto dto);
        Task<IEnumerable<OrderDto>> GetOrdersForUserAsync(int userId);
        Task<OrderDto?> GetOrderAsync(int userId, int orderId);
        Task<IEnumerable<AdminOrderDto>> GetAllOrdersForAdminAsync();
        Task<bool> UpdateFulfillmentStatusAsync(int orderId, string fulfillmentStatus);
        Task HandleRefundWebhookAsync(string paymentIntentId);
        Task<OrderDto> CancelOrderAsync(int userId, int orderId);
        Task<OrderDto> CompletePaymentAsync(int userId, string sessionId);
        Task<AdminOrderDetailDto?> GetOrderForAdminAsync(int orderId);
        Task<bool> DeleteOrderAsync(int orderId);
        Task<OrderDto> CompletePaymentFromWebhookAsync(string sessionId);
    }
}
