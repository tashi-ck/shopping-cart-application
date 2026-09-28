using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        public ChatController(IChatService chatService) => _chatService = chatService;

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendChatMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message cannot be empty.");

            if (dto.Message.Length > 1000)
                return BadRequest("Message is too long.");

            var reply = await _chatService.GetReplyAsync(dto.Message, dto.History ?? new List<ChatMessageDto>());
            return Ok(new ChatResponseDto(reply));
        }
    }
}
