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
    public class NotificationRepository : INotificationRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public NotificationRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<Notification> CreateAsync(Notification notification)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Notifications" ("UserId", "Type", "Message", "ProductId", "IsRead", "CreatedAt")
            VALUES (@UserId, @Type, @Message, @ProductId, FALSE, NOW())
            RETURNING "NotificationId", "UserId", "Type", "Message", "ProductId", "IsRead", "CreatedAt"
            """;
            return await connection.QuerySingleAsync<Notification>(sql, notification);
        }

        public async Task<IEnumerable<Notification>> GetForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "NotificationId", "UserId", "Type", "Message", "ProductId", "IsRead", "CreatedAt"
            FROM "Notifications"
            WHERE "UserId" = @UserId
            ORDER BY "CreatedAt" DESC
            LIMIT 50
            """;
            return await connection.QueryAsync<Notification>(sql, new { UserId = userId });
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """SELECT COUNT(*) FROM "Notifications" WHERE "UserId" = @UserId AND "IsRead" = FALSE""";
            return await connection.QuerySingleAsync<int>(sql, new { UserId = userId });
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Notifications" SET "IsRead" = TRUE
            WHERE "NotificationId" = @NotificationId AND "UserId" = @UserId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { NotificationId = notificationId, UserId = userId });
            return rowsAffected > 0;
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """UPDATE "Notifications" SET "IsRead" = TRUE WHERE "UserId" = @UserId AND "IsRead" = FALSE""";
            await connection.ExecuteAsync(sql, new { UserId = userId });
        }
    }
}
