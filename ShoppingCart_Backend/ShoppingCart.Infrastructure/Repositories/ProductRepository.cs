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
    public class ProductRepository : IProductRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public ProductRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<IEnumerable<ProductWithCategory>> GetAllAsync(
    int? categoryId = null, string? search = null, string? sortBy = null, bool includeInactive = false)
        {
            using var connection = _connectionFactory.CreateConnection();

            var sql = """
        SELECT p."ProductId", p."CategoryId", c."Name" AS "CategoryName", p."Name", p."Description",
               p."Price", p."StockQuantity", p."ImageUrl", p."IsActive", p."CreatedAt", p."UpdatedAt"
        FROM "Products" p
        JOIN "Categories" c ON c."CategoryId" = p."CategoryId"
        WHERE 1 = 1
        """;

            var parameters = new DynamicParameters();

            if (!includeInactive)
                sql += """ AND p."IsActive" = TRUE""";

            if (categoryId.HasValue)
            {
                sql += """ AND p."CategoryId" = @CategoryId""";
                parameters.Add("CategoryId", categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += """ AND p."Name" ILIKE @Search""";
                parameters.Add("Search", $"%{search}%");
            }

            sql += sortBy switch
            {
                "price_asc" => """ ORDER BY p."Price" ASC""",
                "price_desc" => """ ORDER BY p."Price" DESC""",
                "newest" => """ ORDER BY p."CreatedAt" DESC""",
                _ => """ ORDER BY p."Name" ASC"""
            };

            return await connection.QueryAsync<ProductWithCategory>(sql, parameters);
        }

        public async Task<ProductWithCategory?> GetByIdAsync(int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT p."ProductId", p."CategoryId", c."Name" AS "CategoryName", p."Name", p."Description",
                   p."Price", p."StockQuantity", p."ImageUrl", p."CreatedAt", p."UpdatedAt"
            FROM "Products" p
            JOIN "Categories" c ON c."CategoryId" = p."CategoryId"
            WHERE p."ProductId" = @ProductId
            """;

            return await connection.QuerySingleOrDefaultAsync<ProductWithCategory>(sql, new { ProductId = productId });
        }

        public async Task<Product> CreateAsync(Product product)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Products" ("CategoryId", "Name", "Description", "Price", "StockQuantity", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt")
            VALUES (@CategoryId, @Name, @Description, @Price, @StockQuantity, @ImageUrl, TRUE, NOW(), NOW())
            RETURNING "ProductId", "CategoryId", "Name", "Description", "Price", "StockQuantity", "ImageUrl", "IsActive", "CreatedAt", "UpdatedAt"
            """;
            return await connection.QuerySingleAsync<Product>(sql, product);
        }

        public async Task<bool> UpdateAsync(Product product)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Products"
            SET "CategoryId" = @CategoryId, "Name" = @Name, "Description" = @Description,
                "Price" = @Price, "StockQuantity" = @StockQuantity, "ImageUrl" = @ImageUrl, "UpdatedAt" = NOW()
            WHERE "ProductId" = @ProductId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, product);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Products" WHERE "ProductId" = @ProductId""";
            var rowsAffected = await connection.ExecuteAsync(sql, new { ProductId = productId });
            return rowsAffected > 0;
        }

        public async Task<bool> SetActiveAsync(int productId, bool isActive)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
                UPDATE "Products" SET "IsActive" = @IsActive, "UpdatedAt" = NOW()
                WHERE "ProductId" = @ProductId
                """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { ProductId = productId, IsActive = isActive });
            return rowsAffected > 0;
        }
    }
}
