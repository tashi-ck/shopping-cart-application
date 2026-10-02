using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class ChatLogWithUser : ChatLog
    {
        public string? UserEmail { get; set; } // null when the message came from a guest
    }
}
