using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class CartDtos
    {
        public record CartItemDto(
            int CartItemId,
            int ProductId,
            string ProductName,
            string? ImageUrl,
            decimal UnitPrice,
            int Quantity,
            decimal LineTotal,
            int StockQuantity
        );

        public record CartDto(int CartId, List<CartItemDto> Items, decimal TotalAmount);

        public record AddCartItemDto(int ProductId, int Quantity);

        public record UpdateCartItemQuantityDto(int Quantity);
    }
}
