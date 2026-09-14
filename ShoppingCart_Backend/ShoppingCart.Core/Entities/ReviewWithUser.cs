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
        public string UserEmail { get; set; } = string.Empty;
        public int HelpfulCount { get; set; }
        public int NotHelpfulCount { get; set; }

    }
}
