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
        Task<ChatReplyResult> GetReplyAsync(string message, List<ChatMessageDto> history, int? userId = null);

        IAsyncEnumerable<ChatStreamEvent> StreamReplyAsync(
            string message, List<ChatMessageDto> history, int? userId, CancellationToken cancellationToken);

        Task<ChatReplyResult> GetTestReplyAsync(
            string message, List<ChatMessageDto> history, List<int>? policyIds, List<int>? categoryIds);
    }
}
