using Microsoft.Extensions.Configuration;
using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Services
{
    public class AiContentModerationService : IContentModerationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _model;

        public AiContentModerationService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _model = configuration["ContentModeration:Model"] ?? "gpt-4o-mini";
            // Authorization: Bearer header is attached once at registration time
            // in Program.cs via AddHttpClient, not per-request here.
        }

        public async Task<ContentModerationResult> ModerateReviewAsync(string? comment, int rating)
        {
            // Tier 1: cheap, deterministic, no network call, no failure mode.
            var heuristic = HeuristicContentFilter.TryClassify(comment);
            if (heuristic is { } h)
            {
                var verdict = h.Label switch
                {
                    "clean" => ModerationVerdict.Approve,
                    "suspicious" => ModerationVerdict.Flag, // low-confidence heuristic hits go to a human, not auto-reject
                    _ => ModerationVerdict.Reject
                };
                return new ContentModerationResult(verdict, h.Label, h.Confidence, null, "heuristic");
            }

            // Tier 2: ambiguous text — ask the model for a structured verdict.
            // Any exception here propagates to the CALLER (ReviewService), which
            // catches it and falls back to "Flag" so an API outage never blocks a review.
            var systemPrompt = """
                You are a content moderator for e-commerce product reviews.
                Classify the review you're given and respond with JSON matching this exact shape:
                {"verdict":"approve|reject|flag","label":"clean|spam|advertising|abusive|hate_speech|suspicious","confidence":0.0-1.0,"reasoning":"one short sentence"}
 
                approve — genuine feedback about the PRODUCT itself, however harsh or negative. Complaints
                about quality, value, durability, taste, fit, etc. are always approve, no matter how blunt.
 
                reject — ONLY for clear, unambiguous violations: links/promo codes/contact info (advertising),
                spam phrasing, slurs, or harassment/hate speech targeting a protected characteristic.
 
                flag — everything that isn't safely one of the above, including:
                - An accusation against the SELLER or company (fraud, scam, dishonesty, "didn't ship what I
                  ordered on purpose") — this is a reputational/legal claim, not a product complaint, and
                  needs a human to verify it before it's published.
                - An insult or derogatory remark directed AT A PERSON — the seller, "whoever designed this",
                  "the manufacturer", etc. — even if that person isn't named. This is different from criticizing
                  the product/design itself.
                - Sarcasm, innuendo, or any case where the reviewer's real intent is unclear.
                - Anything you are not genuinely confident falls cleanly into approve or reject.
 
                When genuinely torn between approve and flag, prefer flag — a human reviewing it costs
                little, but wrongly auto-publishing an unverified accusation or a personal insult does not.
 
                Examples:
                - "This thing is a joke, way overpriced for the quality." -> approve, clean (harsh but only
                  about the product)
                - "Whoever designed this packaging must be an idiot." -> flag, suspicious (insult directed at
                  a person, even though unnamed — not a product complaint)
                - "I think this seller is running a scam, item didn't match the listing at all." -> flag,
                  suspicious (unverified accusation against the seller)
                - "Buy cheap electronics at my-store.biz!!!" -> reject, advertising
                - Slurs or hateful language targeting a group -> reject, hate_speech
                """;

            var userPrompt = $"Star rating given: {rating}\nReview text: \"{comment}\"";

            var response = await _httpClient.PostAsJsonAsync(
                "https://api.openai.com/v1/chat/completions",
                new
                {
                    model = _model,
                    response_format = new { type = "json_object" }, // guarantees valid JSON back, no prose to strip
                    temperature = 0,                                  // deterministic-ish classification, not creative writing
                    messages = new[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user", content = userPrompt }
                    }
                });

            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            var text = body.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
                ?? throw new InvalidOperationException("Moderation model returned an empty response.");

            var parsed = JsonSerializer.Deserialize<JsonElement>(text);

            var verdictStr = parsed.GetProperty("verdict").GetString();
            var label = parsed.TryGetProperty("label", out var l) ? l.GetString() ?? "suspicious" : "suspicious";
            var confidence = parsed.TryGetProperty("confidence", out var c) ? c.GetDouble() : 0.5;
            var reasoning = parsed.TryGetProperty("reasoning", out var r) ? r.GetString() : null;

            var aiVerdict = verdictStr switch
            {
                "approve" => ModerationVerdict.Approve,
                "reject" => ModerationVerdict.Reject,
                _ => ModerationVerdict.Flag
            };

            return new ContentModerationResult(aiVerdict, label, confidence, reasoning, "ai");
        }
    }
}
