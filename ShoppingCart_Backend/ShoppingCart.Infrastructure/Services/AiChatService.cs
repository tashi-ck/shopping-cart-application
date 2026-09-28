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
        private readonly IOrderService _orderService;
        private readonly string _model;

        private const int MaxHistoryMessages = 10;

        // Hard stop on the tool-calling loop so a confused model can't burn tokens forever.
        private const int MaxToolRounds = 3;

        public AiChatService(
            HttpClient httpClient,
            IPolicyRepository policyRepository,
            IOrderService orderService,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _policyRepository = policyRepository;
            _orderService = orderService;
            _model = configuration["Chatbot:Model"] ?? "gpt-4o-mini";
        }

        public async Task<string> GetReplyAsync(string message, List<ChatMessageDto> history, int? userId = null)
        {
            try
            {
                var isLoggedIn = userId.HasValue;
                var systemPrompt = await BuildSystemPromptAsync(isLoggedIn);

                var messages = new List<object> { new { role = "system", content = systemPrompt } };

                foreach (var turn in history.TakeLast(MaxHistoryMessages))
                {
                    messages.Add(new { role = turn.Role == "assistant" ? "assistant" : "user", content = turn.Content });
                }

                messages.Add(new { role = "user", content = message });

                // Tools are only offered to logged-in users. Anonymous callers can't even
                // "ask" for order data, because the model doesn't know the functions exist.
                var tools = isLoggedIn ? BuildToolDefinitions() : null;

                for (var round = 0; round < MaxToolRounds; round++)
                {
                    var payload = new Dictionary<string, object>
                    {
                        ["model"] = _model,
                        ["temperature"] = 0.3,
                        ["messages"] = messages
                    };
                    if (tools is not null)
                    {
                        payload["tools"] = tools;
                        payload["tool_choice"] = "auto";
                    }

                    var response = await _httpClient.PostAsJsonAsync("https://api.openai.com/v1/chat/completions", payload);
                    response.EnsureSuccessStatusCode();

                    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
                    var assistantMessage = body.GetProperty("choices")[0].GetProperty("message");

                    var wantsTools =
                        isLoggedIn &&
                        assistantMessage.TryGetProperty("tool_calls", out var toolCalls) &&
                        toolCalls.ValueKind == JsonValueKind.Array &&
                        toolCalls.GetArrayLength() > 0;

                    if (!wantsTools)
                    {
                        var reply = assistantMessage.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String
                            ? c.GetString()
                            : null;

                        return string.IsNullOrWhiteSpace(reply) ? FallbackReply() : reply.Trim();
                    }

                    // The assistant turn that requested the tools must be echoed back verbatim,
                    // followed by one "tool" message per call.
                    assistantMessage.TryGetProperty("tool_calls", out var calls);
                    string? assistantText = assistantMessage.TryGetProperty("content", out var ac) && ac.ValueKind == JsonValueKind.String
                        ? ac.GetString()
                        : null;

                    messages.Add(new { role = "assistant", content = assistantText, tool_calls = calls });

                    foreach (var call in calls.EnumerateArray())
                    {
                        var callId = call.GetProperty("id").GetString();
                        var fn = call.GetProperty("function");
                        var name = fn.GetProperty("name").GetString() ?? "";
                        var argsJson = fn.GetProperty("arguments").GetString() ?? "{}";

                        // userId is injected here from the server-side identity — never from the model.
                        var result = await ExecuteToolAsync(name, argsJson, userId!.Value);

                        messages.Add(new { role = "tool", tool_call_id = callId, content = result });
                    }
                }

                // Ran out of rounds without a final text answer.
                return FallbackReply();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Chatbot request failed, returning fallback reply: {ex.Message}");
                return FallbackReply();
            }
        }

        // ---------------- Tools ----------------

        private static object[] BuildToolDefinitions() => new object[]
        {
            new
            {
                type = "function",
                function = new
                {
                    name = "get_recent_orders",
                    description = "Get the logged-in customer's most recent orders (up to 5) with status, total, date, and item names. Use when they ask about 'my orders' or don't give an order number.",
                    parameters = new { type = "object", properties = new { }, required = Array.Empty<string>() }
                }
            },
            new
            {
                type = "function",
                function = new
                {
                    name = "get_order_status",
                    description = "Get the details and current status of ONE of the logged-in customer's orders by its order number.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            orderId = new { type = "integer", description = "The order number, e.g. 42" }
                        },
                        required = new[] { "orderId" }
                    }
                }
            }
        };

        private async Task<string> ExecuteToolAsync(string name, string argsJson, int userId)
        {
            try
            {
                switch (name)
                {
                    case "get_recent_orders":
                        {
                            var orders = (await _orderService.GetOrdersForUserAsync(userId))
                                .OrderByDescending(o => o.CreatedAt)
                                .Take(5)
                                .Select(o => new
                                {
                                    orderId = o.OrderId,
                                    paymentStatus = o.PaymentStatus,
                                    fulfillmentStatus = o.FulfillmentStatus,
                                    total = o.TotalAmount,
                                    placedOn = o.CreatedAt.ToString("yyyy-MM-dd"),
                                    items = o.Items.Select(i => $"{i.ProductName} x{i.Quantity}")
                                })
                                .ToList();

                            return orders.Count == 0
                                ? JsonSerializer.Serialize(new { message = "This customer has no orders yet." })
                                : JsonSerializer.Serialize(orders);
                        }

                    case "get_order_status":
                        {
                            using var doc = JsonDocument.Parse(argsJson);
                            if (!doc.RootElement.TryGetProperty("orderId", out var idProp) || !idProp.TryGetInt32(out var orderId))
                                return JsonSerializer.Serialize(new { error = "A numeric orderId is required." });

                            // Scoped to userId: someone else's order simply comes back as null.
                            var order = await _orderService.GetOrderAsync(userId, orderId);
                            if (order is null)
                                return JsonSerializer.Serialize(new { error = $"No order #{orderId} found on this account." });

                            return JsonSerializer.Serialize(new
                            {
                                orderId = order.OrderId,
                                paymentStatus = order.PaymentStatus,
                                fulfillmentStatus = order.FulfillmentStatus,
                                total = order.TotalAmount,
                                placedOn = order.CreatedAt.ToString("yyyy-MM-dd"),
                                items = order.Items.Select(i => $"{i.ProductName} x{i.Quantity}"),
                                // Mirrors the real rule in OrderRepository.CancelOrderAsync.
                                canStillBeCancelled = order.FulfillmentStatus == "Confirmed"
                            });
                        }

                    default:
                        return JsonSerializer.Serialize(new { error = $"Unknown tool '{name}'." });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Chat tool '{name}' failed: {ex.Message}");
                return JsonSerializer.Serialize(new { error = "Couldn't look that up right now." });
            }
        }

        // ---------------- Prompt ----------------

        private async Task<string> BuildSystemPromptAsync(bool isLoggedIn)
        {
            var policies = await _policyRepository.GetAllAsync();

            var policyText = policies.Any()
                ? string.Join("\n\n", policies.Select(p => $"### {p.Title}\n{p.Content}"))
                : "No store policies are currently configured.";

            var orderRules = isLoggedIn
                ? """
                  The customer is logged in. You have tools to look up THEIR OWN orders.
                  - Use get_order_status when they mention an order number, and get_recent_orders when they don't.
                  - Only state order facts that the tools returned. Never guess a status, date, or delivery time.
                  - If a tool says an order isn't found, say you couldn't find it on their account. Do not speculate why.
                  - You can only VIEW orders. You cannot cancel, modify, or refund anything. If they want to cancel and
                    the tool shows canStillBeCancelled = true, tell them to open Orders > that order > "Cancel this order".
                    If it's false, explain using the cancellation policy.
                  """
                : """
                  The customer is NOT logged in. You cannot look up any order. If they ask about a specific order or
                  "my orders", ask them to log in first, then ask again. Guest orders are tracked via the confirmation email.
                  """;

            return $"""
                You are a helpful shopping assistant for an online store called "Go Shopping".

                For policy questions, answer using ONLY the store policies below. If the answer isn't covered,
                say you don't have that information and suggest contacting support. Do not invent store-specific
                details (prices, exact shipping times, exceptions) that aren't stated.

                {orderRules}

                Keep answers short, friendly, and to the point (2-4 sentences unless more detail is clearly needed).
                Never discuss other customers or their orders. Do not discuss anything unrelated to shopping, orders,
                or these policies. Do not provide legal, medical, or financial advice.

                --- STORE POLICIES ---
                {policyText}
                --- END POLICIES ---
                """;
        }

        private static string FallbackReply() =>
            "Sorry, I'm having trouble answering right now. You can check our Policies page or contact support for help.";
    }
}
