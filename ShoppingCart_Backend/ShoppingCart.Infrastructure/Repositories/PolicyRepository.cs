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
    public class PolicyRepository : IPolicyRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public PolicyRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<IEnumerable<Policy>> GetAllAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "PolicyId", "Slug", "Title", "Content", "UpdatedAt"
            FROM "Policies"
            ORDER BY "Title" ASC
            """;
            return await connection.QueryAsync<Policy>(sql);
        }

        public async Task<Policy?> GetBySlugAsync(string slug)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "PolicyId", "Slug", "Title", "Content", "UpdatedAt"
            FROM "Policies" WHERE "Slug" = @Slug
            """;
            return await connection.QuerySingleOrDefaultAsync<Policy>(sql, new { Slug = slug });
        }

        public async Task<Policy?> GetByIdAsync(int policyId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "PolicyId", "Slug", "Title", "Content", "UpdatedAt"
            FROM "Policies" WHERE "PolicyId" = @PolicyId
            """;
            return await connection.QuerySingleOrDefaultAsync<Policy>(sql, new { PolicyId = policyId });
        }

        public async Task<Policy> CreateAsync(Policy policy)
        {
            using var connection = _connectionFactory.CreateConnection();

            try
            {
                const string sql = """
                INSERT INTO "Policies" ("Slug", "Title", "Content", "UpdatedAt")
                VALUES (@Slug, @Title, @Content, NOW())
                RETURNING "PolicyId", "Slug", "Title", "Content", "UpdatedAt"
                """;
                return await connection.QuerySingleAsync<Policy>(sql, policy);
            }
            catch (PostgresException ex) when (ex.SqlState == "23505")
            {
                throw new InvalidOperationException($"A policy with slug '{policy.Slug}' already exists.");
            }
        }

        public async Task<bool> UpdateAsync(int policyId, string title, string content)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Policies" SET "Title" = @Title, "Content" = @Content, "UpdatedAt" = NOW()
            WHERE "PolicyId" = @PolicyId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { PolicyId = policyId, Title = title, Content = content });
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int policyId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Policies" WHERE "PolicyId" = @PolicyId""";
            var rowsAffected = await connection.ExecuteAsync(sql, new { PolicyId = policyId });
            return rowsAffected > 0;
        }
    }
}
