using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class ChatLog
    {
        public int ChatLogId { get; set; }
        public int? UserId { get; set; } // null for guest conversations
        public string UserMessage { get; set; } = string.Empty;
        public string AssistantReply { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool? Feedback { get; set; } // true = helpful, false = not helpful, null = none given
        public DateTime? FeedbackAt { get; set; }
    }
}
