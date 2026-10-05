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

        // Admin QA sandbox: an optional subset of policies and/or categories to
        // restrict the bot to, so a change can be verified before it's live.
        // Null/empty on either list means "no restriction" (same as production).
        public record ChatTestRequestDto(
            string Message, List<ChatMessageDto>? History,
            List<int>? PolicyIds, List<int>? CategoryIds);

        public record ChatProductDto(
            int ProductId, string Name, string CategoryName,
            decimal Price, int StockQuantity, string? ImageUrl);

        public record ChatReplyResult(string Reply, List<ChatProductDto> Products, List<ChatProductDto> CartProposal);

        public record ChatResponseDto(string Reply, List<ChatProductDto> Products, List<ChatProductDto> CartProposal);

        public record ChatLogDto(int ChatLogId, string? UserEmail, string UserMessage, string AssistantReply, DateTime CreatedAt);
    }
}
