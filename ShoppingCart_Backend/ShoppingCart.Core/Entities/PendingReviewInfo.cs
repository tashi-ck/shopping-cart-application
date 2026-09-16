using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class PendingReviewInfo
    {
        public int ReviewId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? UserFirstName { get; set; }
        public string? UserLastName { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string ModerationStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        // New: lets the list view show "AI: suspicious (60%)" without a per-row detail fetch
        public string? ModeratedBy { get; set; }
        public string? AiModerationLabel { get; set; }
        public double? AiConfidenceScore { get; set; }
    }
}
