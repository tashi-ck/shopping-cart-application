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
    public class ProductImageRepository : IProductImageRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public ProductImageRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<IEnumerable<ProductImage>> GetAllForProductAsync(int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "ProductImageId", "ProductId", "ImageUrl", "DisplayOrder", "CreatedAt"
            FROM "ProductImages"
            WHERE "ProductId" = @ProductId
            ORDER BY "DisplayOrder" ASC, "CreatedAt" ASC
            """;
            return await connection.QueryAsync<ProductImage>(sql, new { ProductId = productId });
        }

        public async Task<ProductImage> CreateAsync(ProductImage image)
        {
            using var connection = _connectionFactory.CreateConnection();

            // New images append to the end of the existing order, rather than defaulting
            // to 0 and jumping ahead of everything already uploaded.
            const string maxOrderSql = """
            SELECT COALESCE(MAX("DisplayOrder"), -1) FROM "ProductImages" WHERE "ProductId" = @ProductId
            """;
            var maxOrder = await connection.QuerySingleAsync<int>(maxOrderSql, new { image.ProductId });

            const string insertSql = """
            INSERT INTO "ProductImages" ("ProductId", "ImageUrl", "DisplayOrder", "CreatedAt")
            VALUES (@ProductId, @ImageUrl, @DisplayOrder, NOW())
            RETURNING "ProductImageId", "ProductId", "ImageUrl", "DisplayOrder", "CreatedAt"
            """;
            return await connection.QuerySingleAsync<ProductImage>(insertSql, new
            {
                image.ProductId,
                image.ImageUrl,
                DisplayOrder = maxOrder + 1
            });
        }

        public async Task<bool> DeleteAsync(int productImageId, int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            DELETE FROM "ProductImages" WHERE "ProductImageId" = @ProductImageId AND "ProductId" = @ProductId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { ProductImageId = productImageId, ProductId = productId });
            return rowsAffected > 0;
        }

        public async Task ReorderAsync(int productId, List<int> orderedProductImageIds)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "ProductImages" SET "DisplayOrder" = @DisplayOrder
            WHERE "ProductImageId" = @ProductImageId AND "ProductId" = @ProductId
            """;

            // One UPDATE per image in the new order — the list's index IS the new DisplayOrder.
            for (int i = 0; i < orderedProductImageIds.Count; i++)
            {
                await connection.ExecuteAsync(sql, new { ProductImageId = orderedProductImageIds[i], ProductId = productId, DisplayOrder = i });
            }
        }
    }
}
