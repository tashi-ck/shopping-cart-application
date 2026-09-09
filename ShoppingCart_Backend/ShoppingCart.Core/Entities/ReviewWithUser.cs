using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class ReviewWithUser : Review
    {
        public string? UserFirstName { get; set; }
        public string? UserLastName { get; set; }
    }
}
