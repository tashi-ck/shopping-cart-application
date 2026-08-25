using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class UserWithOrderCount : User
    {
        public int OrderCount { get; set; }
    }
}
