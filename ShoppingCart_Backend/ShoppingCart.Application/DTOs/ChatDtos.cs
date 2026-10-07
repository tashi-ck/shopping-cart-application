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

        public record ChatTestRequestDto(
            string Message, List<ChatMessageDto>? History,
            List<int>? PolicyIds, List<int>? CategoryIds);

        public record ChatProductDto(
            int ProductId, string Name, string CategoryName,
            decimal Price, int StockQuantity, string? ImageUrl);

        // ChatLogId is null only when logging itself failed (see AiChatService's
        // fail-open LogChatAsync) — feedback simply can't be attached in that rare case.
        public record ChatReplyResult(string Reply, List<ChatProductDto> Products, List<ChatProductDto> CartProposal, int? ChatLogId);

        public record ChatResponseDto(string Reply, List<ChatProductDto> Products, List<ChatProductDto> CartProposal, int? ChatLogId);

        public record ChatLogDto(
            int ChatLogId, string? UserEmail, string UserMessage, string AssistantReply,
            DateTime CreatedAt, bool? Feedback, DateTime? FeedbackAt);

        public record SubmitChatFeedbackDto(bool Helpful);
    }
}
