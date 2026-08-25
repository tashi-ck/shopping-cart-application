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
    public class CartItemRepository : ICartItemRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public CartItemRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<IEnumerable<CartItemWithProduct>> GetAllForCartAsync(int cartId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT ci."CartItemId", ci."CartId", ci."ProductId", p."Name" AS "ProductName",
                   p."ImageUrl", p."Price" AS "UnitPrice", p."StockQuantity", ci."Quantity"
            FROM "CartItems" ci
            JOIN "Products" p ON p."ProductId" = ci."ProductId"
            WHERE ci."CartId" = @CartId
            ORDER BY ci."CreatedAt"
            """;
            return await connection.QueryAsync<CartItemWithProduct>(sql, new { CartId = cartId });
        }

        public async Task<CartItem?> GetByIdAndCartAsync(int cartItemId, int cartId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "CartItemId", "CartId", "ProductId", "Quantity", "CreatedAt", "UpdatedAt"
            FROM "CartItems"
            WHERE "CartItemId" = @CartItemId AND "CartId" = @CartId
            """;
            return await connection.QuerySingleOrDefaultAsync<CartItem>(sql, new { CartItemId = cartItemId, CartId = cartId });
        }

        public async Task<CartItem?> GetByCartAndProductAsync(int cartId, int productId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "CartItemId", "CartId", "ProductId", "Quantity", "CreatedAt", "UpdatedAt"
            FROM "CartItems"
            WHERE "CartId" = @CartId AND "ProductId" = @ProductId
            """;
            return await connection.QuerySingleOrDefaultAsync<CartItem>(sql, new { CartId = cartId, ProductId = productId });
        }

        public async Task<CartItem> CreateAsync(CartItem item)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "CartItems" ("CartId", "ProductId", "Quantity", "CreatedAt", "UpdatedAt")
            VALUES (@CartId, @ProductId, @Quantity, NOW(), NOW())
            RETURNING "CartItemId", "CartId", "ProductId", "Quantity", "CreatedAt", "UpdatedAt"
            """;
            return await connection.QuerySingleAsync<CartItem>(sql, item);
        }

        public async Task<bool> UpdateQuantityAsync(int cartItemId, int cartId, int quantity)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "CartItems"
            SET "Quantity" = @Quantity, "UpdatedAt" = NOW()
            WHERE "CartItemId" = @CartItemId AND "CartId" = @CartId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { CartItemId = cartItemId, CartId = cartId, Quantity = quantity });
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int cartItemId, int cartId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            DELETE FROM "CartItems"
            WHERE "CartItemId" = @CartItemId AND "CartId" = @CartId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { CartItemId = cartItemId, CartId = cartId });
            return rowsAffected > 0;
        }

        public async Task DeleteAllForCartAsync(int cartId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "CartItems" WHERE "CartId" = @CartId""";
            await connection.ExecuteAsync(sql, new { CartId = cartId });
        }
    }
}
