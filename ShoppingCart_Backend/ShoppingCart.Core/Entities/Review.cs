using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Core.Entities
{
    public class Review
    {
        public int ReviewId { get; set; }
        public int ProductId { get; set; }
        public int UserId { get; set; }
        public int OrderId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string ModerationStatus { get; set; } = "Pending";
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // --- AI moderation metadata (new) ---
        public string? ModeratedBy { get; set; }        // "AI" | "Admin" | null (still pending human/never touched)
        public string? AiModerationLabel { get; set; }   // e.g. "clean", "advertising", "abusive"
        public double? AiConfidenceScore { get; set; }
        public string? AiReasoning { get; set; }
        public DateTime? AiModeratedAt { get; set; }
    }
}
