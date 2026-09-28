using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : AuthenticatedControllerBase
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService, IUserService userService) : base(userService)
        {
            _chatService = chatService;
        }

        [HttpPost]
        [AllowAnonymous] // guests can still ask policy questions
        public async Task<IActionResult> SendMessage([FromBody] SendChatMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message cannot be empty.");

            if (dto.Message.Length > 1000)
                return BadRequest("Message is too long.");

            // If a valid JWT came with the request, resolve the local user id.
            // No/invalid token -> null -> the service runs in policy-only mode.
            int? userId = User.Identity?.IsAuthenticated == true
                ? await GetCurrentUserIdAsync()
                : null;

            var reply = await _chatService.GetReplyAsync(
                dto.Message, dto.History ?? new List<ChatMessageDto>(), userId);

            return Ok(new ChatResponseDto(reply));
        }
    }
}
