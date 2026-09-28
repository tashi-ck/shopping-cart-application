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
        Task<string> GetReplyAsync(string message, List<ChatMessageDto> history);
    }
}
