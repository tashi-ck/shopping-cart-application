using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class ChatDtos
    {
        // Role is "user" or "assistant" — mirrors the LLM provider's own message shape,
        // so the frontend's stored history can be forwarded with no transformation.
        public record ChatMessageDto(string Role, string Content);

        public record SendChatMessageDto(string Message, List<ChatMessageDto>? History);

        public record ChatResponseDto(string Reply);
    }
}
