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
    public class CategoryRepository : ICategoryRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public CategoryRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<IEnumerable<Category>> GetAllAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "CategoryId", "Name", "Description"
            FROM "Categories"
            ORDER BY "Name"
            """;
            return await connection.QueryAsync<Category>(sql);
        }

        public async Task<Category?> GetByIdAsync(int categoryId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "CategoryId", "Name", "Description"
            FROM "Categories"
            WHERE "CategoryId" = @CategoryId
            """;
            return await connection.QuerySingleOrDefaultAsync<Category>(sql, new { CategoryId = categoryId });
        }

        public async Task<Category> CreateAsync(Category category)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Categories" ("Name", "Description")
            VALUES (@Name, @Description)
            RETURNING "CategoryId", "Name", "Description"
            """;
            return await connection.QuerySingleAsync<Category>(sql, category);
        }

        public async Task<bool> UpdateAsync(Category category)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Categories"
            SET "Name" = @Name, "Description" = @Description
            WHERE "CategoryId" = @CategoryId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, category);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int categoryId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Categories" WHERE "CategoryId" = @CategoryId""";
            var rowsAffected = await connection.ExecuteAsync(sql, new { CategoryId = categoryId });
            return rowsAffected > 0;
        }
    }
}
