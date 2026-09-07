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
    public class AddressRepository : IAddressRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public AddressRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<IEnumerable<Address>> GetAllForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "AddressId", "UserId", "Label", "FullAddress", "IsDefault", "CreatedAt"
            FROM "Addresses"
            WHERE "UserId" = @UserId
            ORDER BY "IsDefault" DESC, "CreatedAt" DESC
            """;
            return await connection.QueryAsync<Address>(sql, new { UserId = userId });
        }

        public async Task<Address?> GetByIdAndUserAsync(int addressId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT "AddressId", "UserId", "Label", "FullAddress", "IsDefault", "CreatedAt"
            FROM "Addresses"
            WHERE "AddressId" = @AddressId AND "UserId" = @UserId
            """;
            return await connection.QuerySingleOrDefaultAsync<Address>(sql, new { AddressId = addressId, UserId = userId });
        }

        public async Task<Address> CreateAsync(Address address)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            INSERT INTO "Addresses" ("UserId", "Label", "FullAddress", "IsDefault", "CreatedAt")
            VALUES (@UserId, @Label, @FullAddress, @IsDefault, NOW())
            RETURNING "AddressId", "UserId", "Label", "FullAddress", "IsDefault", "CreatedAt"
            """;
            return await connection.QuerySingleAsync<Address>(sql, address);
        }

        public async Task<bool> UpdateAsync(Address address)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Addresses"
            SET "Label" = @Label, "FullAddress" = @FullAddress, "IsDefault" = @IsDefault
            WHERE "AddressId" = @AddressId AND "UserId" = @UserId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, address);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int addressId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Addresses" WHERE "AddressId" = @AddressId AND "UserId" = @UserId""";
            var rowsAffected = await connection.ExecuteAsync(sql, new { AddressId = addressId, UserId = userId });
            return rowsAffected > 0;
        }

        public async Task ClearDefaultForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """UPDATE "Addresses" SET "IsDefault" = FALSE WHERE "UserId" = @UserId AND "IsDefault" = TRUE""";
            await connection.ExecuteAsync(sql, new { UserId = userId });
        }
    }
}
