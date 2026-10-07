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

        // Returns false if no row with that ID exists, so the controller can 404
        // rather than silently succeeding on a bogus/stale chatLogId.
        Task<bool> SetFeedbackAsync(int chatLogId, bool helpful);
    }
}
