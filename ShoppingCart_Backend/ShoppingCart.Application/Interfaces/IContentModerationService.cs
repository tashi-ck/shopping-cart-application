using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public enum ModerationVerdict
    {
        Approve,
        Reject,
        Flag // ambiguous — falls through to the existing admin queue
    }

    // Label is a coarse category, not user-facing copy — the customer-facing
    // RejectionReason text is built from this in ReviewService, not exposed directly.
    public record ContentModerationResult(
        ModerationVerdict Verdict,
        string Label,           // "clean" | "spam" | "advertising" | "abusive" | "hate_speech" | "suspicious"
        double Confidence,      // 0.0–1.0
        string? Reasoning,      // short internal note, shown to admins only
        string DecidedBy        // "heuristic" | "ai" | "none" (moderation failed)
    );

    public interface IContentModerationService
    {
        Task<ContentModerationResult> ModerateReviewAsync(string? comment, int rating);
    }
}
