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

            return Ok(new ChatResponseDto(result.Reply, result.Products, result.CartProposal, result.ChatLogId));
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
                        case ChatLogIdEvent logIdEvt:
                            await WriteSseEventAsync("chatLogId", logIdEvt.ChatLogId.ToString(), cancellationToken);
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

        // Anyone (including guests) can submit feedback on a reply they received —
        // there's no sensitive data in a thumbs up/down, and requiring login would
        // just mean guest conversations (a large share of traffic) get no signal at all.
        [HttpPost("{chatLogId}/feedback")]
        [AllowAnonymous]
        public async Task<IActionResult> SubmitFeedback(int chatLogId, [FromBody] SubmitChatFeedbackDto dto)
        {
            var updated = await _chatLogRepository.SetFeedbackAsync(chatLogId, dto.Helpful);
            return updated ? NoContent() : NotFound();
        }

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

            return Ok(new ChatResponseDto(result.Reply, result.Products, result.CartProposal, result.ChatLogId));
        }

        [HttpGet("admin/logs")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetChatLogs([FromQuery] int limit = 50)
        {
            var logs = await _chatLogRepository.GetRecentAsync(limit);
            return Ok(logs.Select(l => new ChatLogDto(
                l.ChatLogId, l.UserEmail, l.UserMessage, l.AssistantReply, l.CreatedAt, l.Feedback, l.FeedbackAt)));
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
