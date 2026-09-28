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
        // userId is null for anonymous visitors: they get policy answers only, no order tools.
        Task<string> GetReplyAsync(string message, List<ChatMessageDto> history, int? userId = null);
    }
}
