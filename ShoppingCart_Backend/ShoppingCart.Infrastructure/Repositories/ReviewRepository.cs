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
    public class ReviewRepository : IReviewRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public ReviewRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<int?> GetQualifyingOrderIdAsync(int userId, int productId)
        {
            using var connection = _connectionFactory.CreateConnection();

            // The earliest paid order containing this product — "paid" is the bar, not
            // "delivered", matching most stores' actual verified-purchase standard.
            const string sql = """
            SELECT o."OrderId"
            FROM "Orders" o
            JOIN "OrderItems" oi ON oi."OrderId" = o."OrderId"
            WHERE o."UserId" = @UserId AND oi."ProductId" = @ProductId AND o."PaymentStatus" = 'Paid'
            ORDER BY o."CreatedAt" ASC
            LIMIT 1
            """;
            return await connection.QuerySingleOrDefaultAsync<int?>(sql, new { UserId = userId, ProductId = productId });
        }

        public async Task<Review?> GetByUserAndProductAsync(int userId, int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "ReviewId", "ProductId", "UserId", "OrderId", "Rating", "Comment", "CreatedAt", "UpdatedAt"
            FROM "Reviews" WHERE "UserId" = @UserId AND "ProductId" = @ProductId
            """;
            return await connection.QuerySingleOrDefaultAsync<Review>(sql, new { UserId = userId, ProductId = productId });
        }

        public async Task<Review> CreateAsync(Review review)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Reviews" ("ProductId", "UserId", "OrderId", "Rating", "Comment", "CreatedAt", "UpdatedAt")
            VALUES (@ProductId, @UserId, @OrderId, @Rating, @Comment, NOW(), NOW())
            RETURNING "ReviewId", "ProductId", "UserId", "OrderId", "Rating", "Comment", "CreatedAt", "UpdatedAt"
            """;
            return await connection.QuerySingleAsync<Review>(sql, review);
        }

        public async Task<bool> UpdateAsync(Review review)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Reviews" SET "Rating" = @Rating, "Comment" = @Comment, "UpdatedAt" = NOW()
            WHERE "ReviewId" = @ReviewId AND "UserId" = @UserId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, review);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int reviewId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Reviews" WHERE "ReviewId" = @ReviewId AND "UserId" = @UserId""";
            var rowsAffected = await connection.ExecuteAsync(sql, new { ReviewId = reviewId, UserId = userId });
            return rowsAffected > 0;
        }

        public async Task<IEnumerable<ReviewWithUser>> GetForProductAsync(int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT r."ReviewId", r."ProductId", r."UserId", r."OrderId", r."Rating", r."Comment", r."CreatedAt", r."UpdatedAt",
                   u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName"
            FROM "Reviews" r
            JOIN "Users" u ON u."UserId" = r."UserId"
            WHERE r."ProductId" = @ProductId
            ORDER BY r."CreatedAt" DESC
            """;
            return await connection.QueryAsync<ReviewWithUser>(sql, new { ProductId = productId });
        }

        public async Task<(double AverageRating, int ReviewCount)> GetSummaryAsync(int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT COALESCE(AVG("Rating"), 0) AS "AverageRating", COUNT(*) AS "ReviewCount"
            FROM "Reviews" WHERE "ProductId" = @ProductId
            """;
            var result = await connection.QuerySingleAsync<(double AverageRating, int ReviewCount)>(sql, new { ProductId = productId });
            return result;
        }
    }
}
