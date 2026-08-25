using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class OrderDtos
    {
        public record OrderItemDto(
            int OrderItemId,
            int ProductId,
            string ProductName,
            string? ImageUrl,
            int Quantity,
            decimal UnitPrice,
            decimal LineTotal
        );

        public record OrderDto(
            int OrderId,
            string Status,
            decimal TotalAmount,
            string ShippingAddress,
            DateTime CreatedAt,
            List<OrderItemDto> Items
        );

        public record CheckoutDto(string ShippingAddress);

        public record BuyNowDto(int ProductId, int Quantity, string ShippingAddress);

        public record AdminOrderDto(
            int OrderId,
            int UserId,
            string UserEmail,
            string? UserFirstName,
            string? UserLastName,
            string Status,
            decimal TotalAmount,
            string ShippingAddress,
            DateTime CreatedAt
        );

        public record UpdateOrderStatusDto(string Status);

        public record AdminOrderDetailDto(
            int OrderId,
            int UserId,
            string UserEmail,
            string? UserFirstName,
            string? UserLastName,
            string Status,
            decimal TotalAmount,
            string ShippingAddress,
            string? PaymentReference,
            DateTime CreatedAt,
            List<OrderItemDto> Items
        );
    }
}
