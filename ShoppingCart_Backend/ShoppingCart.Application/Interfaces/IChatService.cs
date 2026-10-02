using ShoppingCart.Application.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IChatService
    {
        // Non-streaming — kept for callers that just want the final text in one shot.
        Task<ChatReplyResult> GetReplyAsync(string message, List<ChatMessageDto> history, int? userId = null);

        // Streaming — what the live widget uses so replies render token-by-token.
        IAsyncEnumerable<ChatStreamEvent> StreamReplyAsync(
            string message, List<ChatMessageDto> history, int? userId, CancellationToken cancellationToken);
    }
}
