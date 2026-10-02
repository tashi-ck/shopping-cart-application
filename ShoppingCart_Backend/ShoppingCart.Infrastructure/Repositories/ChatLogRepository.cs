using Dapper;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Repositories
{
    public class ChatLogRepository : IChatLogRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public ChatLogRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<ChatLog> CreateAsync(ChatLog log)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "ChatLogs" ("UserId", "UserMessage", "AssistantReply", "CreatedAt")
            VALUES (@UserId, @UserMessage, @AssistantReply, NOW())
            RETURNING "ChatLogId", "UserId", "UserMessage", "AssistantReply", "CreatedAt"
            """;
            return await connection.QuerySingleAsync<ChatLog>(sql, log);
        }

        public async Task<IEnumerable<ChatLogWithUser>> GetRecentAsync(int limit)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT cl."ChatLogId", cl."UserId", cl."UserMessage", cl."AssistantReply", cl."CreatedAt",
                   u."Email" AS "UserEmail"
            FROM "ChatLogs" cl
            LEFT JOIN "Users" u ON u."UserId" = cl."UserId"
            ORDER BY cl."CreatedAt" DESC
            LIMIT @Limit
            """;
            return await connection.QueryAsync<ChatLogWithUser>(sql, new { Limit = limit });
        }
    }
}
