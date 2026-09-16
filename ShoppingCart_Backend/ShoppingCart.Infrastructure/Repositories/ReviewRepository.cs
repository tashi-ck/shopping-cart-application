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
            const string sql = """
            SELECT o."OrderId"
            FROM "Orders" o
            JOIN "OrderItems" oi ON oi."OrderId" = o."OrderId"
            WHERE o."UserId" = @UserId AND oi."ProductId" = @ProductId
                  AND o."PaymentStatus" = 'Paid' AND o."FulfillmentStatus" = 'Delivered'
            ORDER BY o."CreatedAt" ASC
            LIMIT 1
            """;
            return await connection.QuerySingleOrDefaultAsync<int?>(sql, new { UserId = userId, ProductId = productId });
        }

        public async Task<Review?> GetByUserAndProductAsync(int userId, int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "ReviewId", "ProductId", "UserId", "OrderId", "Rating", "Comment",
                   "ModerationStatus", "RejectionReason", "ModeratedBy", "AiModerationLabel",
                   "AiConfidenceScore", "AiReasoning", "AiModeratedAt", "CreatedAt", "UpdatedAt"
            FROM "Reviews" WHERE "UserId" = @UserId AND "ProductId" = @ProductId
            """;
            return await connection.QuerySingleOrDefaultAsync<Review>(sql, new { UserId = userId, ProductId = productId });
        }

        public async Task<Review?> GetByIdAsync(int reviewId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "ReviewId", "ProductId", "UserId", "OrderId", "Rating", "Comment",
                   "ModerationStatus", "RejectionReason", "ModeratedBy", "AiModerationLabel",
                   "AiConfidenceScore", "AiReasoning", "AiModeratedAt", "CreatedAt", "UpdatedAt"
            FROM "Reviews" WHERE "ReviewId" = @ReviewId
            """;
            return await connection.QuerySingleOrDefaultAsync<Review>(sql, new { ReviewId = reviewId });
        }

        public async Task<Review> CreateAsync(Review review)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Reviews"
                ("ProductId", "UserId", "OrderId", "Rating", "Comment", "ModerationStatus", "RejectionReason",
                 "ModeratedBy", "AiModerationLabel", "AiConfidenceScore", "AiReasoning", "AiModeratedAt",
                 "CreatedAt", "UpdatedAt")
            VALUES
                (@ProductId, @UserId, @OrderId, @Rating, @Comment, @ModerationStatus, @RejectionReason,
                 @ModeratedBy, @AiModerationLabel, @AiConfidenceScore, @AiReasoning, @AiModeratedAt,
                 NOW(), NOW())
            RETURNING "ReviewId", "ProductId", "UserId", "OrderId", "Rating", "Comment", "ModerationStatus",
                      "RejectionReason", "ModeratedBy", "AiModerationLabel", "AiConfidenceScore", "AiReasoning",
                      "AiModeratedAt", "CreatedAt", "UpdatedAt"
            """;
            return await connection.QuerySingleAsync<Review>(sql, review);
        }

        public async Task<bool> UpdateAsync(Review review)
        {
            using var connection = _connectionFactory.CreateConnection();

            // Editing a review re-runs moderation (see ReviewService) rather than
            // unconditionally resetting to Pending — the new ModerationStatus/Rejection/AI
            // fields are all set explicitly by the caller based on that fresh verdict.
            const string sql = """
            UPDATE "Reviews"
            SET "Rating" = @Rating, "Comment" = @Comment, "ModerationStatus" = @ModerationStatus,
                "RejectionReason" = @RejectionReason, "ModeratedBy" = @ModeratedBy,
                "AiModerationLabel" = @AiModerationLabel, "AiConfidenceScore" = @AiConfidenceScore,
                "AiReasoning" = @AiReasoning, "AiModeratedAt" = @AiModeratedAt, "UpdatedAt" = NOW()
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

        public async Task<IEnumerable<ReviewWithUser>> GetForProductAsync(int productId, int? currentUserId)
        {
            using var connection = _connectionFactory.CreateConnection();

            // Public rule: only Approved reviews show — EXCEPT the viewer's own review,
            // regardless of its status, so an author can always see their pending/rejected
            // submission rather than it silently disappearing.
            const string sql = """
            SELECT r."ReviewId", r."ProductId", r."UserId", r."OrderId", r."Rating", r."Comment",
                   r."ModerationStatus", r."RejectionReason", r."ModeratedBy", r."AiModerationLabel",
                   r."AiConfidenceScore", r."AiReasoning", r."AiModeratedAt", r."CreatedAt", r."UpdatedAt",
                   u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName", u."Email" AS "UserEmail",
                   COALESCE(SUM(CASE WHEN v."IsHelpful" = TRUE THEN 1 ELSE 0 END), 0) AS "HelpfulCount",
                   COALESCE(SUM(CASE WHEN v."IsHelpful" = FALSE THEN 1 ELSE 0 END), 0) AS "NotHelpfulCount"
            FROM "Reviews" r
            JOIN "Users" u ON u."UserId" = r."UserId"
            LEFT JOIN "ReviewHelpfulVotes" v ON v."ReviewId" = r."ReviewId"
            WHERE r."ProductId" = @ProductId
                  AND (r."ModerationStatus" = 'Approved' OR r."UserId" = @CurrentUserId)
            GROUP BY r."ReviewId", u."FirstName", u."LastName", u."Email"
            ORDER BY r."CreatedAt" DESC
            """;
            return await connection.QueryAsync<ReviewWithUser>(sql, new { ProductId = productId, CurrentUserId = currentUserId ?? -1 });
        }

        public async Task<(double AverageRating, int ReviewCount, Dictionary<int, int> Distribution)> GetSummaryAsync(int productId)
        {
            using var connection = _connectionFactory.CreateConnection();

            const string statsSql = """
            SELECT COALESCE(AVG("Rating"), 0) AS "AverageRating", COUNT(*) AS "ReviewCount"
            FROM "Reviews" WHERE "ProductId" = @ProductId AND "ModerationStatus" = 'Approved'
            """;
            var stats = await connection.QuerySingleAsync<(double AverageRating, int ReviewCount)>(statsSql, new { ProductId = productId });

            const string distributionSql = """
            SELECT "Rating", COUNT(*) AS "Count"
            FROM "Reviews" WHERE "ProductId" = @ProductId AND "ModerationStatus" = 'Approved'
            GROUP BY "Rating"
            """;
            var rows = await connection.QueryAsync<(int Rating, int Count)>(distributionSql, new { ProductId = productId });

            var distribution = Enumerable.Range(1, 5).ToDictionary(star => star, star => 0);
            foreach (var row in rows) distribution[row.Rating] = row.Count;

            return (stats.AverageRating, stats.ReviewCount, distribution);
        }

        public async Task UpsertHelpfulVoteAsync(int reviewId, int userId, bool isHelpful)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "ReviewHelpfulVotes" ("ReviewId", "UserId", "IsHelpful", "CreatedAt")
            VALUES (@ReviewId, @UserId, @IsHelpful, NOW())
            ON CONFLICT ("ReviewId", "UserId") DO UPDATE SET "IsHelpful" = @IsHelpful
            """;
            await connection.ExecuteAsync(sql, new { ReviewId = reviewId, UserId = userId, IsHelpful = isHelpful });
        }

        public async Task RemoveHelpfulVoteAsync(int reviewId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "ReviewHelpfulVotes" WHERE "ReviewId" = @ReviewId AND "UserId" = @UserId""";
            await connection.ExecuteAsync(sql, new { ReviewId = reviewId, UserId = userId });
        }

        public async Task<bool?> GetUserVoteAsync(int reviewId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """SELECT "IsHelpful" FROM "ReviewHelpfulVotes" WHERE "ReviewId" = @ReviewId AND "UserId" = @UserId""";
            return await connection.QuerySingleOrDefaultAsync<bool?>(sql, new { ReviewId = reviewId, UserId = userId });
        }

        public async Task<IEnumerable<PendingReviewInfo>> GetPendingReviewsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT r."ReviewId", r."ProductId", p."Name" AS "ProductName",
               u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName",
               r."Rating", r."Comment", r."ModerationStatus", r."CreatedAt",
               r."ModeratedBy", r."AiModerationLabel", r."AiConfidenceScore"
        FROM "Reviews" r
        JOIN "Products" p ON p."ProductId" = r."ProductId"
        JOIN "Users" u ON u."UserId" = r."UserId"
        WHERE r."ModerationStatus" = 'Pending'
        ORDER BY r."CreatedAt" ASC
        """;
            return await connection.QueryAsync<PendingReviewInfo>(sql);
        }

        public async Task<bool> ModerateAsync(int reviewId, string status, string? rejectionReason)
        {
            using var connection = _connectionFactory.CreateConnection();

            // An explicit admin decision always overrides any prior AI verdict and
            // is recorded as such — ModeratedBy flips to "Admin" here unconditionally.
            const string sql = """
            UPDATE "Reviews"
            SET "ModerationStatus" = @Status, "RejectionReason" = @RejectionReason,
                "ModeratedBy" = 'Admin', "UpdatedAt" = NOW()
            WHERE "ReviewId" = @ReviewId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { ReviewId = reviewId, Status = status, RejectionReason = rejectionReason });
            return rowsAffected > 0;
        }

        public async Task<IEnumerable<PendingReviewInfo>> GetProcessedReviewsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT r."ReviewId", r."ProductId", p."Name" AS "ProductName",
               u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName",
               r."Rating", r."Comment", r."ModerationStatus", r."CreatedAt",
               r."ModeratedBy", r."AiModerationLabel", r."AiConfidenceScore"
        FROM "Reviews" r
        JOIN "Products" p ON p."ProductId" = r."ProductId"
        JOIN "Users" u ON u."UserId" = r."UserId"
        WHERE r."ModerationStatus" IN ('Approved', 'Rejected')
        ORDER BY r."UpdatedAt" DESC
        """;
            return await connection.QueryAsync<PendingReviewInfo>(sql);
        }

        public async Task<ReviewWithUser?> GetByIdWithUserAsync(int reviewId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT r."ReviewId", r."ProductId", r."UserId", r."OrderId", r."Rating", r."Comment",
               r."ModerationStatus", r."RejectionReason", r."ModeratedBy", r."AiModerationLabel",
               r."AiConfidenceScore", r."AiReasoning", r."AiModeratedAt", r."CreatedAt", r."UpdatedAt",
               u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName", u."Email" AS "UserEmail",
               COALESCE(SUM(CASE WHEN v."IsHelpful" = TRUE THEN 1 ELSE 0 END), 0) AS "HelpfulCount",
               COALESCE(SUM(CASE WHEN v."IsHelpful" = FALSE THEN 1 ELSE 0 END), 0) AS "NotHelpfulCount"
        FROM "Reviews" r
        JOIN "Users" u ON u."UserId" = r."UserId"
        LEFT JOIN "ReviewHelpfulVotes" v ON v."ReviewId" = r."ReviewId"
        WHERE r."ReviewId" = @ReviewId
        GROUP BY r."ReviewId", u."FirstName", u."LastName", u."Email"
        """;
            return await connection.QuerySingleOrDefaultAsync<ReviewWithUser>(sql, new { ReviewId = reviewId });
        }
    }
}
