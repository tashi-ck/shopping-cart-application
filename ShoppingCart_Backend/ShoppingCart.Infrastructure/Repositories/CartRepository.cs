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
    public class CartRepository : ICartRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public CartRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<Cart?> GetByUserIdAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "CartId", "UserId", "CreatedAt", "UpdatedAt"
            FROM "Carts"
            WHERE "UserId" = @UserId
            """;
            return await connection.QuerySingleOrDefaultAsync<Cart>(sql, new { UserId = userId });
        }

        public async Task<Cart> CreateAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Carts" ("UserId", "CreatedAt", "UpdatedAt")
            VALUES (@UserId, NOW(), NOW())
            RETURNING "CartId", "UserId", "CreatedAt", "UpdatedAt"
            """;
            return await connection.QuerySingleAsync<Cart>(sql, new { UserId = userId });
        }
    }
}
