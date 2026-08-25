using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Models
{
    public record CheckoutLineItem(int ProductId, string ProductName, decimal UnitPrice, int Quantity);
}
