using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IChatLogRepository
    {
        Task<ChatLog> CreateAsync(ChatLog log);
        Task<IEnumerable<ChatLogWithUser>> GetRecentAsync(int limit);
    }
}
