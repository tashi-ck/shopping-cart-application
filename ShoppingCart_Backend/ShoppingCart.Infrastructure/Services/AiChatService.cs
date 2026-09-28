using Microsoft.Extensions.Configuration;
using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.Infrastructure.Services
{
    public class AiChatService : IChatService
    {
        private readonly HttpClient _httpClient;
        private readonly IPolicyRepository _policyRepository;
        private readonly string _model;

        // Cap how much history we forward — enough for a coherent back-and-forth,
        // not so much that every message balloons in token cost.
        private const int MaxHistoryMessages = 10;

        public AiChatService(HttpClient httpClient, IPolicyRepository policyRepository, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _policyRepository = policyRepository;
            _model = configuration["Chatbot:Model"] ?? "gpt-4o-mini";
        }

        public async Task<string> GetReplyAsync(string message, List<ChatMessageDto> history)
        {
            // A chatbot outage or a bad API key must never crash the page it's embedded on —
            // same fail-open reasoning as AiContentModerationService / SendGridEmailService.
            try
            {
                var systemPrompt = await BuildSystemPromptAsync();

                var messages = new List<object> { new { role = "system", content = systemPrompt } };

                foreach (var turn in history.TakeLast(MaxHistoryMessages))
                {
                    messages.Add(new { role = turn.Role == "assistant" ? "assistant" : "user", content = turn.Content });
                }

                messages.Add(new { role = "user", content = message });

                var response = await _httpClient.PostAsJsonAsync(
                    "https://api.openai.com/v1/chat/completions",
                    new
                    {
                        model = _model,
                        temperature = 0.3, // mostly-factual policy answers, not creative writing
                        messages
                    });

                response.EnsureSuccessStatusCode();

                var body = await response.Content.ReadFromJsonAsync<JsonElement>();
                var reply = body.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

                return string.IsNullOrWhiteSpace(reply)
                    ? FallbackReply()
                    : reply.Trim();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Chatbot request failed, returning fallback reply: {ex.Message}");
                return FallbackReply();
            }
        }

        private async Task<string> BuildSystemPromptAsync()
        {
            var policies = await _policyRepository.GetAllAsync();

            var policyText = policies.Any()
                ? string.Join("\n\n", policies.Select(p => $"### {p.Title}\n{p.Content}"))
                : "No store policies are currently configured.";

            return $"""
                You are a helpful shopping assistant for an online store called "Go Shopping".

                Answer customer questions using ONLY the store policies below. If the answer isn't
                covered by these policies, say you don't have that information and suggest the
                customer contact support — do not guess or make up store-specific details (prices,
                exact shipping times, exceptions, etc.) that aren't stated here.

                Keep answers short, friendly, and to the point (2-4 sentences unless more detail is
                clearly needed). Do not discuss anything unrelated to shopping, orders, or these
                policies. Do not provide legal, medical, or financial advice.

                --- STORE POLICIES ---
                {policyText}
                --- END POLICIES ---
                """;
        }

        private static string FallbackReply() =>
            "Sorry, I'm having trouble answering right now. You can check our Policies page or contact support for help.";
    }
}
