using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class ProductWithCategory : Product
    {
        public string CategoryName { get; set; } = string.Empty;
    }
}
