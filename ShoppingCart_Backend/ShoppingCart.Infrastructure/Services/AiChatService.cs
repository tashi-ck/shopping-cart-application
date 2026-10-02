using Microsoft.Extensions.Configuration;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.Infrastructure.Services
{
    public class AiChatService : IChatService
    {
        private readonly HttpClient _httpClient;
        private readonly IPolicyService _policyService;
        private readonly IOrderService _orderService;
        private readonly IProductService _productService;
        private readonly ICategoryService _categoryService;
        private readonly IRecommendationService _recommendationService;
        private readonly IReviewService _reviewService;
        private readonly IChatLogRepository _chatLogRepository;
        private readonly string _model;

        private const int MaxHistoryMessages = 10;
        private const int MaxToolRounds = 4;
        private const int MaxProductsPerSearch = 5;
        private const int MaxCardsPerReply = 5;

        public AiChatService(
            HttpClient httpClient,
            IPolicyService policyService,
            IOrderService orderService,
            IProductService productService,
            ICategoryService categoryService,
            IRecommendationService recommendationService,
            IReviewService reviewService,
            IChatLogRepository chatLogRepository,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _policyService = policyService;
            _orderService = orderService;
            _productService = productService;
            _categoryService = categoryService;
            _recommendationService = recommendationService;
            _reviewService = reviewService;
            _chatLogRepository = chatLogRepository;
            _model = configuration["Chatbot:Model"] ?? "gpt-4o-mini";
        }

        // ==================== Non-streaming ====================

        public async Task<ChatReplyResult> GetReplyAsync(string message, List<ChatMessageDto> history, int? userId = null)
        {
            var surfacedProducts = new List<ChatProductDto>();

            try
            {
                var isLoggedIn = userId.HasValue;
                var systemPrompt = await BuildSystemPromptAsync(isLoggedIn);

                var messages = new List<object> { new { role = "system", content = systemPrompt } };
                foreach (var turn in history.TakeLast(MaxHistoryMessages))
                    messages.Add(new { role = turn.Role == "assistant" ? "assistant" : "user", content = turn.Content });
                messages.Add(new { role = "user", content = message });

                var tools = BuildToolDefinitions(isLoggedIn);

                for (var round = 0; round < MaxToolRounds; round++)
                {
                    var payload = new Dictionary<string, object>
                    {
                        ["model"] = _model,
                        ["temperature"] = 0.3,
                        ["messages"] = messages,
                        ["tools"] = tools,
                        ["tool_choice"] = "auto"
                    };

                    var response = await _httpClient.PostAsJsonAsync("https://api.openai.com/v1/chat/completions", payload);
                    response.EnsureSuccessStatusCode();

                    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
                    var assistantMessage = body.GetProperty("choices")[0].GetProperty("message");

                    var wantsTools =
                        assistantMessage.TryGetProperty("tool_calls", out var calls) &&
                        calls.ValueKind == JsonValueKind.Array &&
                        calls.GetArrayLength() > 0;

                    if (!wantsTools)
                    {
                        var reply = assistantMessage.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String
                            ? c.GetString()
                            : null;

                        var finalReply = string.IsNullOrWhiteSpace(reply) ? FallbackText() : reply.Trim();
                        await LogChatAsync(userId, message, finalReply);

                        return new ChatReplyResult(finalReply, surfacedProducts.Take(MaxCardsPerReply).ToList());
                    }

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

                        var result = await ExecuteToolAsync(name, argsJson, userId, surfacedProducts);
                        messages.Add(new { role = "tool", tool_call_id = callId, content = result });
                    }
                }

                var fallback = FallbackText();
                await LogChatAsync(userId, message, fallback);
                return new ChatReplyResult(fallback, new List<ChatProductDto>());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Chatbot request failed, returning fallback reply: {ex.Message}");
                var fallback = FallbackText();
                await LogChatAsync(userId, message, fallback);
                return new ChatReplyResult(fallback, new List<ChatProductDto>());
            }
        }

        // ==================== Streaming ====================

        public async IAsyncEnumerable<ChatStreamEvent> StreamReplyAsync(
            string message, List<ChatMessageDto> history, int? userId,
            [EnumeratorCancellation] CancellationToken cancellationToken)
        {
            var isLoggedIn = userId.HasValue;
            var systemPrompt = await BuildSystemPromptAsync(isLoggedIn);

            var messages = new List<object> { new { role = "system", content = systemPrompt } };
            foreach (var turn in history.TakeLast(MaxHistoryMessages))
                messages.Add(new { role = turn.Role == "assistant" ? "assistant" : "user", content = turn.Content });
            messages.Add(new { role = "user", content = message });

            var tools = BuildToolDefinitions(isLoggedIn);
            var surfacedProducts = new List<ChatProductDto>();

            // Note: this method intentionally has no surrounding try/catch — C# iterators
            // can't yield inside a try block that has a catch clause. Exceptions bubble up
            // to the controller, which wraps the `await foreach` instead.
            for (var round = 0; round < MaxToolRounds; round++)
            {
                var payload = new Dictionary<string, object>
                {
                    ["model"] = _model,
                    ["temperature"] = 0.3,
                    ["messages"] = messages,
                    ["tools"] = tools,
                    ["tool_choice"] = "auto",
                    ["stream"] = true
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
                {
                    Content = JsonContent.Create(payload)
                };

                using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                response.EnsureSuccessStatusCode();

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var reader = new StreamReader(stream);

                var contentBuilder = new StringBuilder();
                var toolCallBuilders = new Dictionary<int, (string? Id, string? Name, StringBuilder Args)>();
                string? finishReason = null;

                while (!reader.EndOfStream)
                {
                    var line = await reader.ReadLineAsync(cancellationToken);
                    if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data: ")) continue;

                    var dataLine = line["data: ".Length..];
                    if (dataLine == "[DONE]") break;

                    using var doc = JsonDocument.Parse(dataLine);
                    var choice = doc.RootElement.GetProperty("choices")[0];

                    if (choice.TryGetProperty("finish_reason", out var fr) && fr.ValueKind == JsonValueKind.String)
                        finishReason = fr.GetString();

                    var delta = choice.GetProperty("delta");

                    if (delta.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String)
                    {
                        var text = c.GetString()!;
                        contentBuilder.Append(text);
                        yield return new ChatTextChunkEvent(text);
                    }

                    if (delta.TryGetProperty("tool_calls", out var tcs) && tcs.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var tc in tcs.EnumerateArray())
                        {
                            var index = tc.GetProperty("index").GetInt32();
                            if (!toolCallBuilders.TryGetValue(index, out var entry))
                                entry = (null, null, new StringBuilder());

                            if (tc.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
                                entry.Id = idEl.GetString();

                            if (tc.TryGetProperty("function", out var fnEl))
                            {
                                if (fnEl.TryGetProperty("name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String)
                                    entry.Name = nameEl.GetString();
                                if (fnEl.TryGetProperty("arguments", out var argsEl) && argsEl.ValueKind == JsonValueKind.String)
                                    entry.Args.Append(argsEl.GetString());
                            }

                            toolCallBuilders[index] = entry;
                        }
                    }
                }

                if (finishReason == "tool_calls" && toolCallBuilders.Count > 0)
                {
                    var orderedCalls = toolCallBuilders.OrderBy(kvp => kvp.Key).Select(kvp => kvp.Value).ToList();

                    messages.Add(new
                    {
                        role = "assistant",
                        content = (string?)null,
                        tool_calls = orderedCalls.Select(call => new
                        {
                            id = call.Id,
                            type = "function",
                            function = new { name = call.Name, arguments = call.Args.ToString() }
                        }).ToArray()
                    });

                    foreach (var call in orderedCalls)
                    {
                        var result = await ExecuteToolAsync(call.Name ?? "", call.Args.ToString(), userId, surfacedProducts);
                        messages.Add(new { role = "tool", tool_call_id = call.Id, content = result });
                    }

                    continue; // next round, now with tool results in context
                }

                // No more tools requested — what streamed this round is the final answer.
                var finalReply = contentBuilder.Length > 0 ? contentBuilder.ToString() : FallbackText();
                await LogChatAsync(userId, message, finalReply);

                if (surfacedProducts.Count > 0)
                    yield return new ChatProductsEvent(surfacedProducts.Take(MaxCardsPerReply).ToList());

                yield return new ChatDoneEvent();
                yield break;
            }

            var fallback = FallbackText();
            yield return new ChatTextChunkEvent(fallback);
            await LogChatAsync(userId, message, fallback);
            yield return new ChatDoneEvent();
        }

        // ==================== Tool definitions ====================

        private static object[] BuildToolDefinitions(bool isLoggedIn)
        {
            var tools = new List<object>
            {
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "search_products",
                        description = "Search the store catalog. Use whenever the customer wants to find, browse, or compare products, or asks what we sell. Returns up to 5 matching products.",
                        parameters = new
                        {
                            type = "object",
                            properties = new
                            {
                                query = new { type = "string", description = "Keywords, e.g. 'wireless headphones'. Omit to browse by category or price only." },
                                categoryName = new { type = "string", description = "Category name, e.g. 'Fitness'. Call list_categories first if unsure." },
                                minPrice = new { type = "number", description = "Minimum price in dollars" },
                                maxPrice = new { type = "number", description = "Maximum price in dollars" },
                                inStockOnly = new { type = "boolean", description = "Only return products currently in stock" },
                                sortBy = new { type = "string", @enum = new[] { "price_asc", "price_desc", "newest" }, description = "Optional ordering. Omit for best keyword match." }
                            },
                            required = Array.Empty<string>()
                        }
                    }
                },
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "get_similar_products",
                        description = "Get products similar to a given product (by its productId from an earlier search result). Use for 'something like this' or 'alternatives'.",
                        parameters = new
                        {
                            type = "object",
                            properties = new { productId = new { type = "integer", description = "The productId of the reference product" } },
                            required = new[] { "productId" }
                        }
                    }
                },
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "get_product_reviews",
                        description = "Get the average rating and number of reviews for a product (by its productId). Use when asked if a product is good, well-reviewed, or worth buying.",
                        parameters = new
                        {
                            type = "object",
                            properties = new { productId = new { type = "integer", description = "The productId to check reviews for" } },
                            required = new[] { "productId" }
                        }
                    }
                },
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "list_categories",
                        description = "List the store's product categories.",
                        parameters = new { type = "object", properties = new { }, required = Array.Empty<string>() }
                    }
                }
            };

            if (isLoggedIn)
            {
                tools.Add(new
                {
                    type = "function",
                    function = new
                    {
                        name = "get_recent_orders",
                        description = "Get the logged-in customer's most recent orders (up to 5) with status, total, date, and item names. Use when they ask about 'my orders' or don't give an order number.",
                        parameters = new { type = "object", properties = new { }, required = Array.Empty<string>() }
                    }
                });
                tools.Add(new
                {
                    type = "function",
                    function = new
                    {
                        name = "get_order_status",
                        description = "Get the details and current status of ONE of the logged-in customer's orders by its order number.",
                        parameters = new
                        {
                            type = "object",
                            properties = new { orderId = new { type = "integer", description = "The order number, e.g. 42" } },
                            required = new[] { "orderId" }
                        }
                    }
                });
            }

            return tools.ToArray();
        }

        // ==================== Tool execution ====================

        private async Task<string> ExecuteToolAsync(string name, string argsJson, int? userId, List<ChatProductDto> surfaced)
        {
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(argsJson) ? "{}" : argsJson);
                var args = doc.RootElement;

                switch (name)
                {
                    case "search_products":
                        return await SearchProductsAsync(args, surfaced);

                    case "get_similar_products":
                        return await GetSimilarProductsAsync(args, surfaced);

                    case "get_product_reviews":
                        return await GetProductReviewsAsync(args);

                    case "list_categories":
                        {
                            var categories = await _categoryService.GetAllCategoriesAsync();
                            return JsonSerializer.Serialize(categories.Select(c => new { name = c.Name, description = c.Description }));
                        }

                    case "get_recent_orders":
                    case "get_order_status":
                        if (userId is null)
                            return JsonSerializer.Serialize(new { error = "The customer must be logged in to look up orders." });

                        return name == "get_recent_orders"
                            ? await GetRecentOrdersAsync(userId.Value)
                            : await GetOrderStatusAsync(args, userId.Value);

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

        private async Task<string> SearchProductsAsync(JsonElement args, List<ChatProductDto> surfaced)
        {
            var query = GetString(args, "query");
            var categoryName = GetString(args, "categoryName");
            var minPrice = GetDecimal(args, "minPrice");
            var maxPrice = GetDecimal(args, "maxPrice");
            var inStockOnly = args.TryGetProperty("inStockOnly", out var isProp) && isProp.ValueKind == JsonValueKind.True;
            var sortBy = GetString(args, "sortBy");

            var all = (await _productService.GetAllProductsAsync(null, null, null)).ToList();

            IEnumerable<(Application.DTOs.ProductDtos.ProductDto P, int Score)> scored =
                all.Select(p => (p, 0));

            var tokens = Tokenize(query);
            if (tokens.Count > 0)
            {
                scored = all
                    .Select(p => (P: p, Score: ScoreProduct(p, tokens)))
                    .Where(x => x.Score > 0);
            }

            if (!string.IsNullOrWhiteSpace(categoryName))
                scored = scored.Where(x => x.P.CategoryName.Contains(categoryName, StringComparison.OrdinalIgnoreCase));
            if (minPrice is not null) scored = scored.Where(x => x.P.Price >= minPrice);
            if (maxPrice is not null) scored = scored.Where(x => x.P.Price <= maxPrice);
            if (inStockOnly) scored = scored.Where(x => x.P.StockQuantity > 0);

            var ordered = sortBy switch
            {
                "price_asc" => scored.OrderBy(x => x.P.Price),
                "price_desc" => scored.OrderByDescending(x => x.P.Price),
                "newest" => scored.OrderByDescending(x => x.P.CreatedAt),
                _ => scored.OrderByDescending(x => x.Score).ThenBy(x => x.P.Name)
            };

            var results = ordered.Take(MaxProductsPerSearch).Select(x => x.P).ToList();

            if (results.Count == 0)
                return JsonSerializer.Serialize(new { message = "No matching products found. Suggest broadening the search or trying another category." });

            foreach (var p in results)
                AddSurfaced(surfaced, new ChatProductDto(p.ProductId, p.Name, p.CategoryName, p.Price, p.StockQuantity, p.ImageUrl));

            return JsonSerializer.Serialize(results.Select(p => new
            {
                productId = p.ProductId,
                name = p.Name,
                category = p.CategoryName,
                price = p.Price,
                inStock = p.StockQuantity > 0,
                stockQuantity = p.StockQuantity,
                description = Truncate(p.Description, 160)
            }));
        }

        private async Task<string> GetSimilarProductsAsync(JsonElement args, List<ChatProductDto> surfaced)
        {
            if (!args.TryGetProperty("productId", out var idProp) || !idProp.TryGetInt32(out var productId))
                return JsonSerializer.Serialize(new { error = "A numeric productId is required." });

            var similar = (await _recommendationService.GetSimilarProductsAsync(productId, 5))
                .Select(s => new ChatProductDto(s.ProductId, s.Name, s.CategoryName, s.Price, s.StockQuantity, s.ImageUrl))
                .ToList();

            if (similar.Count == 0)
            {
                var reference = await _productService.GetProductAsync(productId);
                if (reference is null)
                    return JsonSerializer.Serialize(new { error = $"Product {productId} was not found." });

                similar = (await _productService.GetAllProductsAsync(reference.CategoryId, null, null))
                    .Where(p => p.ProductId != productId && p.StockQuantity > 0)
                    .Take(5)
                    .Select(p => new ChatProductDto(p.ProductId, p.Name, p.CategoryName, p.Price, p.StockQuantity, p.ImageUrl))
                    .ToList();
            }

            if (similar.Count == 0)
                return JsonSerializer.Serialize(new { message = "No similar products available right now." });

            foreach (var p in similar) AddSurfaced(surfaced, p);

            return JsonSerializer.Serialize(similar.Select(p => new
            {
                productId = p.ProductId,
                name = p.Name,
                category = p.CategoryName,
                price = p.Price,
                inStock = p.StockQuantity > 0
            }));
        }

        private async Task<string> GetProductReviewsAsync(JsonElement args)
        {
            if (!args.TryGetProperty("productId", out var idProp) || !idProp.TryGetInt32(out var productId))
                return JsonSerializer.Serialize(new { error = "A numeric productId is required." });

            var summary = await _reviewService.GetReviewSummaryAsync(productId);

            return summary.ReviewCount == 0
                ? JsonSerializer.Serialize(new { message = "This product has no reviews yet." })
                : JsonSerializer.Serialize(new { averageRating = summary.AverageRating, reviewCount = summary.ReviewCount });
        }

        private async Task<string> GetRecentOrdersAsync(int userId)
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

        private async Task<string> GetOrderStatusAsync(JsonElement args, int userId)
        {
            if (!args.TryGetProperty("orderId", out var idProp) || !idProp.TryGetInt32(out var orderId))
                return JsonSerializer.Serialize(new { error = "A numeric orderId is required." });

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
                canStillBeCancelled = order.FulfillmentStatus == "Confirmed"
            });
        }

        // ==================== Helpers ====================

        private async Task LogChatAsync(int? userId, string userMessage, string assistantReply)
        {
            try
            {
                await _chatLogRepository.CreateAsync(new ChatLog
                {
                    UserId = userId,
                    UserMessage = userMessage,
                    AssistantReply = assistantReply
                });
            }
            catch (Exception ex)
            {
                // Same reasoning as every other non-critical side effect in this app:
                // a logging failure must never surface to the person chatting.
                Console.WriteLine($"Failed to save chat log: {ex.Message}");
            }
        }

        private static void AddSurfaced(List<ChatProductDto> list, ChatProductDto product)
        {
            if (list.All(p => p.ProductId != product.ProductId))
                list.Add(product);
        }

        private static List<string> Tokenize(string? query)
        {
            if (string.IsNullOrWhiteSpace(query)) return new List<string>();

            return query.ToLowerInvariant()
                .Split(new[] { ' ', ',', '.', '-', '/', '&' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length >= 2)
                .Select(t => t.Length > 3 ? t.TrimEnd('s') : t)
                .Distinct()
                .ToList();
        }

        private static int ScoreProduct(Application.DTOs.ProductDtos.ProductDto p, List<string> tokens)
        {
            var name = p.Name.ToLowerInvariant();
            var category = p.CategoryName.ToLowerInvariant();
            var description = (p.Description ?? "").ToLowerInvariant();

            var score = 0;
            foreach (var t in tokens)
            {
                if (name.Contains(t)) score += 3;
                if (category.Contains(t)) score += 2;
                if (description.Contains(t)) score += 1;
            }
            return score;
        }

        private static string? GetString(JsonElement args, string prop) =>
            args.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

        private static decimal? GetDecimal(JsonElement args, string prop) =>
            args.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d) ? d : null;

        private static string? Truncate(string? text, int max) =>
            text is null ? null : text.Length <= max ? text : text[..max] + "...";

        // ==================== Prompt ====================

        private async Task<string> BuildSystemPromptAsync(bool isLoggedIn)
        {
            var policies = await _policyService.GetAllPoliciesAsync();

            var policyText = policies.Any()
                ? string.Join("\n\n", policies.Select(p => $"### {p.Title}\n{p.Content}"))
                : "No store policies are currently configured.";

            var orderRules = isLoggedIn
                ? """
                  ORDERS: The customer is logged in. You have tools to look up THEIR OWN orders.
                  - Use get_order_status when they mention an order number, and get_recent_orders when they don't.
                  - Only state order facts that the tools returned. Never guess a status, date, or delivery time.
                  - If a tool says an order isn't found, say you couldn't find it on their account. Do not speculate why.
                  - You can only VIEW orders. You cannot cancel, modify, or refund anything. If they want to cancel and
                    canStillBeCancelled is true, tell them to open Orders > that order > "Cancel this order".
                    If it's false, explain using the cancellation policy.
                  """
                : """
                  ORDERS: The customer is NOT logged in. You cannot look up any order. If they ask about a specific order or
                  "my orders", ask them to log in first, then ask again. Guest orders are tracked via the confirmation email.
                  """;

            return $"""
                You are a helpful shopping assistant for an online store called "Go Shopping".

                POLICIES: For policy questions, answer using ONLY the store policies below. If the answer isn't covered,
                say you don't have that information and suggest contacting support. Do not invent store-specific
                details (exact shipping times, exceptions) that aren't stated.

                PRODUCTS: You can search the catalog with your tools.
                - ONLY recommend or mention products that a tool returned in this conversation. Never invent products,
                  prices, or specs. Quote prices and stock exactly as the tools give them.
                - If the customer states a budget, pass it as maxPrice. If they name a type of item, search for it.
                - Use get_product_reviews when asked if a product is good or well-reviewed. State the rating/count
                  exactly as returned, and never claim a rating exists if the tool says there are no reviews yet.
                - Product cards are shown to the customer automatically beneath your message, so do NOT repeat every
                  detail. Give a one or two sentence summary, mention the top pick and why, and note if something is low
                  or out of stock.
                - If nothing matches, say so and suggest a broader search or a related category.
                - You cannot add items to the cart or place orders. Tell them to open the product and use "Add to cart".

                {orderRules}

                Keep answers short, friendly, and to the point (2-4 sentences unless more detail is clearly needed).
                Never discuss other customers or their orders. Do not discuss anything unrelated to shopping, orders,
                products, or these policies. Do not provide legal, medical, or financial advice.

                --- STORE POLICIES ---
                {policyText}
                --- END POLICIES ---
                """;
        }

        private static string FallbackText() =>
            "Sorry, I'm having trouble answering right now. You can check our Policies page or contact support for help.";
    }
}
