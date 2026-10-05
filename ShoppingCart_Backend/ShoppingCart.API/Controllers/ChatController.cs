using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : AuthenticatedControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IChatLogRepository _chatLogRepository;

        private static readonly JsonSerializerOptions CamelCaseOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public ChatController(IChatService chatService, IUserService userService, IChatLogRepository chatLogRepository)
            : base(userService)
        {
            _chatService = chatService;
            _chatLogRepository = chatLogRepository;
        }

        [HttpPost]
        [AllowAnonymous]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> SendMessage([FromBody] SendChatMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message cannot be empty.");

            if (dto.Message.Length > 1000)
                return BadRequest("Message is too long.");

            int? userId = User.Identity?.IsAuthenticated == true
                ? await GetCurrentUserIdAsync()
                : null;

            var result = await _chatService.GetReplyAsync(
                dto.Message, dto.History ?? new List<ChatMessageDto>(), userId);

            return Ok(new ChatResponseDto(result.Reply, result.Products, result.CartProposal));
        }

        [HttpPost("stream")]
        [AllowAnonymous]
        [EnableRateLimiting("chat")]
        public async Task StreamMessage([FromBody] SendChatMessageDto dto, CancellationToken cancellationToken)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            if (string.IsNullOrWhiteSpace(dto.Message) || dto.Message.Length > 1000)
            {
                await WriteSseEventAsync("error", "Message is invalid.", cancellationToken);
                await WriteSseEventAsync("done", "", cancellationToken);
                return;
            }

            int? userId = User.Identity?.IsAuthenticated == true
                ? await GetCurrentUserIdAsync()
                : null;

            try
            {
                await foreach (var evt in _chatService.StreamReplyAsync(
                    dto.Message, dto.History ?? new List<ChatMessageDto>(), userId, cancellationToken))
                {
                    switch (evt)
                    {
                        case ChatTextChunkEvent chunk:
                            await WriteSseEventAsync("chunk", chunk.Text, cancellationToken);
                            break;
                        case ChatStatusEvent status:
                            await WriteSseEventAsync("status", status.Label, cancellationToken);
                            break;
                        case ChatProductsEvent productsEvt:
                            await WriteSseEventAsync("products", JsonSerializer.Serialize(productsEvt.Products, CamelCaseOptions), cancellationToken);
                            break;
                        case ChatCartProposalEvent cartEvt:
                            await WriteSseEventAsync("cartProposal", JsonSerializer.Serialize(cartEvt.Products, CamelCaseOptions), cancellationToken);
                            break;
                        case ChatDoneEvent:
                            await WriteSseEventAsync("done", "", cancellationToken);
                            break;
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // The person navigated away or closed the tab mid-stream — nothing left to do.
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Chat stream failed: {ex.Message}");
                await WriteSseEventAsync("error", "Sorry, I'm having trouble answering right now.", cancellationToken);
                await WriteSseEventAsync("done", "", cancellationToken);
            }
        }

        // Admin QA sandbox — chat against a restricted subset of policies/categories
        // before a real change goes live. Non-streaming for simplicity, and never
        // logged to ChatLogs.
        [HttpPost("admin/test")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> TestMessage([FromBody] ChatTestRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message cannot be empty.");

            if (dto.Message.Length > 1000)
                return BadRequest("Message is too long.");

            var result = await _chatService.GetTestReplyAsync(
                dto.Message, dto.History ?? new List<ChatMessageDto>(), dto.PolicyIds, dto.CategoryIds);

            return Ok(new ChatResponseDto(result.Reply, result.Products, result.CartProposal));
        }

        [HttpGet("admin/logs")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetChatLogs([FromQuery] int limit = 50)
        {
            var logs = await _chatLogRepository.GetRecentAsync(limit);
            return Ok(logs.Select(l => new ChatLogDto(l.ChatLogId, l.UserEmail, l.UserMessage, l.AssistantReply, l.CreatedAt)));
        }

        private async Task WriteSseEventAsync(string eventName, string data, CancellationToken cancellationToken)
        {
            var encoded = JsonSerializer.Serialize(data);
            await Response.WriteAsync($"event: {eventName}\n", cancellationToken);
            await Response.WriteAsync($"data: {encoded}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}
