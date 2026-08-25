using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class PaymentDtos
    {
        public record CreateCheckoutSessionDto(string ShippingAddress);
        public record CreateBuyNowCheckoutSessionDto(int ProductId, int Quantity, string ShippingAddress);
        public record CheckoutSessionResponseDto(string Url);
    }
}
