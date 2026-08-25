using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class CartItemWithProduct
    {
        public int CartItemId { get; set; }
        public int CartId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal UnitPrice { get; set; } // Product's CURRENT price — live, not snapshotted (it's still a cart)
        public int StockQuantity { get; set; }
        public int Quantity { get; set; }
    }
}
