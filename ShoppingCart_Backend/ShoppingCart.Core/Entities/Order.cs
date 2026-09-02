using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class Order
    {
        public int OrderId { get; set; }
        public int UserId { get; set; }
        public string PaymentStatus { get; set; } = "Paid";       // Paid, Refunded — Stripe-controlled only
        public string FulfillmentStatus { get; set; } = "Confirmed"; // Confirmed, Shipped, Delivered, Cancelled — admin-controlled only
        public decimal TotalAmount { get; set; }
        public string ShippingAddress { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? PaymentReference { get; set; }
    }
}
