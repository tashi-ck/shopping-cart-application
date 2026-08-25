using Dapper;
using Npgsql;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public UserRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<User?> GetByAuth0IdAsync(string auth0Id)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "UserId", "Auth0Id", "Email", "FirstName", "LastName", "CreatedAt", "UpdatedAt"
            FROM "Users"
            WHERE "Auth0Id" = @Auth0Id
            """;

            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Auth0Id = auth0Id });
        }

        public async Task<User> CreateAsync(User user)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Users" ("Auth0Id", "Email", "FirstName", "LastName", "CreatedAt", "UpdatedAt")
            VALUES (@Auth0Id, @Email, @FirstName, @LastName, NOW(), NOW())
            RETURNING "UserId", "Auth0Id", "Email", "FirstName", "LastName", "CreatedAt", "UpdatedAt"
            """;

            return await connection.QuerySingleAsync<User>(sql, user);
        }

        public async Task UpdateProfileAsync(User user)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Users"
            SET "Email" = @Email, "FirstName" = @FirstName, "LastName" = @LastName, "UpdatedAt" = NOW()
            WHERE "UserId" = @UserId
            """;

            await connection.ExecuteAsync(sql, user);
        }

        public async Task<User?> GetByIdAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT "UserId", "Auth0Id", "Email", "FirstName", "LastName", "CreatedAt", "UpdatedAt"
        FROM "Users"
        WHERE "UserId" = @UserId
        """;
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { UserId = userId });
        }

        public async Task<IEnumerable<UserWithOrderCount>> GetAllForAdminAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT u."UserId", u."Auth0Id", u."Email", u."FirstName", u."LastName",
               u."IsActive", u."CreatedAt", u."UpdatedAt",
               COUNT(o."OrderId") AS "OrderCount"
        FROM "Users" u
        LEFT JOIN "Orders" o ON o."UserId" = u."UserId"
        GROUP BY u."UserId"
        ORDER BY u."CreatedAt" DESC
        """;
            return await connection.QueryAsync<UserWithOrderCount>(sql);
        }

        public async Task<bool> SetActiveAsync(int userId, bool isActive)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        UPDATE "Users" SET "IsActive" = @IsActive, "UpdatedAt" = NOW()
        WHERE "UserId" = @UserId
        """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { UserId = userId, IsActive = isActive });
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Users" WHERE "UserId" = @UserId""";

            try
            {
                var rowsAffected = await connection.ExecuteAsync(sql, new { UserId = userId });
                return rowsAffected > 0;
            }
            catch (PostgresException ex) when (ex.SqlState == "23503")
            {
                // Same FK situation as deleting a Product tied to an order — Orders.UserId has
                // no ON DELETE CASCADE, so a user with order history can't be hard-deleted.
                // Catching it here means the API returns a clean message instead of a raw 500.
                throw new InvalidOperationException(
                    "Can't delete this user — they have existing orders. Deactivate the account instead.");
            }
        }
    }
}
