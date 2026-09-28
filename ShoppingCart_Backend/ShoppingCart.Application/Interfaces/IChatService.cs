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
        // userId is null for anonymous visitors: policy + product tools only, no order tools.
        Task<ChatReplyResult> GetReplyAsync(string message, List<ChatMessageDto> history, int? userId = null);
    }
}
