using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Services
{
    public class HeuristicContentFilter
    {
        // Matches http(s) links, "www.", emails, AND bare domains like "mywebsite.com"
        // or "my-shop.io" — the original version only caught the first three, which is
        // why "BUY CHEAP PRODUCTS FROM mywebsite.com!!!" slipped through as "clean".
        private static readonly Regex UrlOrEmailPattern = new(
            @"(https?://\S+" +                                  // http(s)://...
            @"|www\.\S+" +                                      // www....
            @"|\S+@\S+\.\S+" +                                  // email
            @"|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+" + // one or more "label."
              @"(?:com|net|org|io|co|shop|store|xyz|info|biz|site|dev|app|ai|me)\b)", // ...ending in a real TLD
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex PhonePattern = new(
            @"(\+?\d[\d\-\s]{7,}\d)", RegexOptions.Compiled);

        private static readonly string[] SpamKeywords =
        {
            "buy now", "buy cheap", "discount code", "cheap price", "cheap products",
            "click here", "visit our site", "promo code", "follow us", "dm me", "whatsapp me",
            "limited offer", "free shipping", "best price guaranteed"
        };

        /// <summary>
        /// Attempts a fast, deterministic classification with no external calls.
        /// Returns null when the text is ambiguous and should be escalated to the AI tier.
        /// </summary>
        public static (string Label, double Confidence)? TryClassify(string? comment)
        {
            if (string.IsNullOrWhiteSpace(comment))
                return ("clean", 1.0); // no comment = nothing to moderate

            var text = comment.Trim();
            var lower = text.ToLowerInvariant();

            // Domain/URL/email/phone checks run FIRST and unconditionally — a review
            // containing a link or bare domain is advertising regardless of casing,
            // punctuation, or anything else in the surrounding text.
            if (UrlOrEmailPattern.IsMatch(text) || PhonePattern.IsMatch(text))
                return ("advertising", 0.95);

            if (SpamKeywords.Any(k => lower.Contains(k)))
                return ("spam", 0.9);

            // ALL CAPS shouting with real letters in it — low-confidence signal,
            // worth a look but not a slam-dunk auto-reject on its own.
            if (text.Length > 15 && text == text.ToUpperInvariant() && text.Any(char.IsLetter))
                return ("suspicious", 0.6);

            // Very short, generic alphanumeric text ("nice", "good, works well") — cheap clean pass.
            // Only reachable once the checks above have already ruled out links/domains/spam
            // phrases, so this can no longer misfire on something like "mywebsite.com".
            if (text.Length <= 40 && Regex.IsMatch(lower, @"^[a-z0-9\s!.,']+$"))
                return ("clean", 0.7);

            return null; // ambiguous — escalate to AI tier
        }
    }
}
