using ShoppingCart.Application.Models;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IOrderRepository
    {
        Task<int> CreateOrderWithItemsAsync(int userId, string shippingAddress, List<OrderItemInput> items, string? paymentReference = null, string? paymentIntentId = null);
        Task<IEnumerable<Order>> GetAllForUserAsync(int userId);
        Task<Order?> GetByIdAsync(int orderId, int userId);
        Task<IEnumerable<OrderItemWithProduct>> GetItemsForOrderAsync(int orderId);
        Task<IEnumerable<OrderWithUser>> GetAllOrdersAsync();
        Task<bool> UpdateFulfillmentStatusAsync(int orderId, string fulfillmentStatus);
        Task<bool> UpdatePaymentStatusAsync(int orderId, string paymentStatus);
        Task CancelOrderAsync(int orderId, int userId);
        Task<Order?> GetByPaymentReferenceAsync(string paymentReference);
        Task<Order?> GetByPaymentIntentIdAsync(string paymentIntentId);
        Task<OrderWithUser?> GetByIdForAdminAsync(int orderId);
        Task<bool> DeleteOrderAsync(int orderId);
    }
}
