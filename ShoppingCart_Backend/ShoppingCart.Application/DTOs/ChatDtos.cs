using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class ChatDtos
    {
        public record ChatMessageDto(string Role, string Content);

        public record SendChatMessageDto(string Message, List<ChatMessageDto>? History);

        // Slim product shape for chat cards
        public record ChatProductDto(
            int ProductId, string Name, string CategoryName,
            decimal Price, int StockQuantity, string? ImageUrl);

        // What the non-streaming path returns: text + any products surfaced by tools
        public record ChatReplyResult(string Reply, List<ChatProductDto> Products);

        public record ChatResponseDto(string Reply, List<ChatProductDto> Products);

        // Admin: one logged exchange
        public record ChatLogDto(int ChatLogId, string? UserEmail, string UserMessage, string AssistantReply, DateTime CreatedAt);
    }
}
