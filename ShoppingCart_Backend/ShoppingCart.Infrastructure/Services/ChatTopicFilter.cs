using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Services
{
    /// <summary>
    /// Cheap, deterministic heuristic for whether a chat message is likely
    /// unrelated to shopping (e.g. "write me a python script", "solve this
    /// homework problem"). This is a backstop layer on top of the system
    /// prompt's own instructions, used only to detect REPEATED off-topic
    /// turns — it deliberately favors false negatives (letting something
    /// through) over false positives (blocking a real shopping question).
    /// </summary>
    public static class ChatTopicFilter
    {
        private static readonly Regex OffTopicPattern = new(
            @"(```" +
            @"|\bwrite (a |me )?(python|javascript|java|c\+\+|html|css|sql|typescript)\b" +
            @"|\bdebug (this|my) code\b" +
            @"|\bsolve (this|for)\b.*\b(equation|x)\b" +
            @"|\b(homework|essay|thesis|dissertation)\b.{0,20}\b(on|about|for)\b" +
            @"|\bwrite (a |me )?(poem|story|song|lyrics)\b" +
            @"|what(?:'s| is) the capital of" +
            @"|who is the (president|prime minister) of" +
            @"|\btranslate (this|the following)\b" +
            @"|\btell me a joke\b" +
            @"|\bweather (today|forecast|in)\b" +
            @"|how many (planets|continents)\b)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        // If the message mentions anything shopping-related, never flag it
        // off-topic even if it also happens to match a pattern above —
        // e.g. "write a review for the headphones" stays on-topic.
        private static readonly Regex ShoppingKeywords = new(
            @"\b(product|order|cart|shipping|return|refund|polic\w*|price|stock|discount|categor\w*|" +
            @"review|checkout|deliver\w*|payment|store|buy|purchase|item|warranty|exchange)\w*\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static bool IsLikelyOffTopic(string? message)
        {
            if (string.IsNullOrWhiteSpace(message)) return false;
            if (ShoppingKeywords.IsMatch(message)) return false;
            return OffTopicPattern.IsMatch(message);
        }
    }
}
