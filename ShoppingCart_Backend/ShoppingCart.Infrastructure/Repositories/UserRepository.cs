using Dapper;
using Npgsql;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
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
                SELECT "UserId", "Auth0Id", "Email", "FirstName", "LastName", "IsActive", "IsAdmin",
                       "HasCompletedOnboarding", "CreatedAt", "UpdatedAt"
                FROM "Users" WHERE "Auth0Id" = @Auth0Id
                """;
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Auth0Id = auth0Id });
        }

        public async Task<User> CreateAsync(User user)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
                INSERT INTO "Users" ("Auth0Id", "Email", "FirstName", "LastName", "IsAdmin", "CreatedAt", "UpdatedAt")
                VALUES (@Auth0Id, @Email, @FirstName, @LastName, @IsAdmin, NOW(), NOW())
                RETURNING "UserId", "Auth0Id", "Email", "FirstName", "LastName", "IsActive", "IsAdmin",
                          "HasCompletedOnboarding", "CreatedAt", "UpdatedAt"
                """;
            return await connection.QuerySingleAsync<User>(sql, user);
        }

        public async Task UpdateProfileAsync(User user)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
                UPDATE "Users"
                SET "Email" = @Email, "FirstName" = @FirstName, "LastName" = @LastName, "IsAdmin" = @IsAdmin, "UpdatedAt" = NOW()
                WHERE "UserId" = @UserId
                """;
            await connection.ExecuteAsync(sql, user);
        }

        public async Task<User?> GetByIdAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT "UserId", "Auth0Id", "Email", "FirstName", "LastName",
               "HasCompletedOnboarding", "CreatedAt", "UpdatedAt"
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
                throw new InvalidOperationException(
                    "Can't delete this user — they have existing orders. Deactivate the account instead.");
            }
        }

        public async Task<IEnumerable<User>> GetAdminUsersAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
        SELECT "UserId", "Auth0Id", "Email", "FirstName", "LastName", "IsActive", "IsAdmin", "CreatedAt", "UpdatedAt"
        FROM "Users" WHERE "IsAdmin" = TRUE AND "IsActive" = TRUE
        """;
            return await connection.QueryAsync<User>(sql);
        }

        public async Task<User> GetOrCreateGuestUserAsync(string email)
        {
            using var connection = _connectionFactory.CreateConnection();

            const string selectSql = """
        SELECT "UserId", "Auth0Id", "Email", "FirstName", "LastName", "IsActive", "IsAdmin", "IsGuest", "CreatedAt", "UpdatedAt"
        FROM "Users" WHERE "Email" = @Email AND "IsGuest" = TRUE
        """;
            var existing = await connection.QuerySingleOrDefaultAsync<User>(selectSql, new { Email = email });
            if (existing is not null) return existing;

            const string insertSql = """
        INSERT INTO "Users" ("Auth0Id", "Email", "IsGuest", "IsActive", "CreatedAt", "UpdatedAt")
        VALUES (NULL, @Email, TRUE, TRUE, NOW(), NOW())
        RETURNING "UserId", "Auth0Id", "Email", "FirstName", "LastName", "IsActive", "IsAdmin", "IsGuest", "CreatedAt", "UpdatedAt"
        """;
            return await connection.QuerySingleAsync<User>(insertSql, new { Email = email });
        }

        // --- Onboarding / personalization (new) ---

        public async Task SaveOnboardingAsync(int userId, List<int> categoryIds, decimal? minBudget, decimal? maxBudget, string shoppingPriority)
        {
            using var connection = _connectionFactory.CreateConnection();
            connection.Open();
            using var transaction = connection.BeginTransaction();

            try
            {
                const string updateUserSql = """
                UPDATE "Users"
                SET "HasCompletedOnboarding" = TRUE, "PreferredMinPrice" = @MinBudget,
                    "PreferredMaxPrice" = @MaxBudget, "ShoppingPriority" = @ShoppingPriority, "UpdatedAt" = NOW()
                WHERE "UserId" = @UserId
                """;
                await connection.ExecuteAsync(updateUserSql,
                    new { UserId = userId, MinBudget = minBudget, MaxBudget = maxBudget, ShoppingPriority = shoppingPriority },
                    transaction);

                // Simplest correct approach for a small preference set: clear and re-insert,
                // rather than diffing — onboarding is submitted once as a whole, not incrementally.
                const string deleteSql = """DELETE FROM "UserPreferredCategories" WHERE "UserId" = @UserId""";
                await connection.ExecuteAsync(deleteSql, new { UserId = userId }, transaction);

                const string insertSql = """
                INSERT INTO "UserPreferredCategories" ("UserId", "CategoryId") VALUES (@UserId, @CategoryId)
                """;
                foreach (var categoryId in categoryIds)
                {
                    await connection.ExecuteAsync(insertSql, new { UserId = userId, CategoryId = categoryId }, transaction);
                }

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<UserPreferences?> GetPreferencesAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();

            const string userSql = """
                SELECT "PreferredMinPrice" AS "MinBudget", "PreferredMaxPrice" AS "MaxBudget",
                       "ShoppingPriority", "HasCompletedOnboarding"
                FROM "Users" WHERE "UserId" = @UserId
                """;
            var row = await connection.QuerySingleOrDefaultAsync<UserPreferencesRow>(userSql, new { UserId = userId });
            if (row is null || !row.HasCompletedOnboarding) return null;

            const string categoriesSql = """SELECT "CategoryId" FROM "UserPreferredCategories" WHERE "UserId" = @UserId""";
            var categoryIds = (await connection.QueryAsync<int>(categoriesSql, new { UserId = userId })).ToList();

            return new UserPreferences(categoryIds, row.MinBudget, row.MaxBudget, row.ShoppingPriority);
        }

        private class UserPreferencesRow
        {
            public decimal? MinBudget { get; set; }
            public decimal? MaxBudget { get; set; }
            public string? ShoppingPriority { get; set; }
            public bool HasCompletedOnboarding { get; set; }
        }
    }
}
