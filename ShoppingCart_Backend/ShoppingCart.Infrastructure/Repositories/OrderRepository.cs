using Dapper;
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
    public class OrderRepository : IOrderRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public OrderRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        private const string OrderColumns = """
        "OrderId", "UserId", "PaymentStatus", "FulfillmentStatus", "TotalAmount",
        "ShippingAddress", "PaymentReference", "PaymentIntentId", "CreatedAt", "UpdatedAt"
        """;

        public async Task<int> CreateOrderWithItemsAsync(
            int userId, string shippingAddress, List<OrderItemInput> items,
            string? paymentReference = null, string? paymentIntentId = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            connection.Open();
            using var transaction = connection.BeginTransaction();

            try
            {
                decimal totalAmount = 0;

                foreach (var item in items)
                {
                    const string lockSql = """
                    SELECT "StockQuantity" FROM "Products" WHERE "ProductId" = @ProductId FOR UPDATE
                    """;
                    var currentStock = await connection.QuerySingleOrDefaultAsync<int?>(
                        lockSql, new { item.ProductId }, transaction);

                    if (currentStock is null)
                        throw new InvalidOperationException($"Product {item.ProductId} no longer exists.");
                    if (currentStock < item.Quantity)
                        throw new InvalidOperationException($"Not enough stock for product {item.ProductId}.");

                    const string decrementSql = """
                    UPDATE "Products" SET "StockQuantity" = "StockQuantity" - @Quantity WHERE "ProductId" = @ProductId
                    """;
                    await connection.ExecuteAsync(decrementSql, new { item.ProductId, item.Quantity }, transaction);

                    totalAmount += item.UnitPrice * item.Quantity;
                }

                const string insertOrderSql = """
                INSERT INTO "Orders"
                    ("UserId", "PaymentStatus", "FulfillmentStatus", "TotalAmount", "ShippingAddress",
                     "PaymentReference", "PaymentIntentId", "CreatedAt", "UpdatedAt")
                VALUES
                    (@UserId, 'Paid', 'Confirmed', @TotalAmount, @ShippingAddress,
                     @PaymentReference, @PaymentIntentId, NOW(), NOW())
                RETURNING "OrderId"
                """;
                var orderId = await connection.QuerySingleAsync<int>(insertOrderSql, new
                {
                    UserId = userId,
                    TotalAmount = totalAmount,
                    ShippingAddress = shippingAddress,
                    PaymentReference = paymentReference,
                    PaymentIntentId = paymentIntentId
                }, transaction);

                const string insertItemSql = """
                INSERT INTO "OrderItems" ("OrderId", "ProductId", "Quantity", "UnitPrice")
                VALUES (@OrderId, @ProductId, @Quantity, @UnitPrice)
                """;
                foreach (var item in items)
                {
                    await connection.ExecuteAsync(insertItemSql, new
                    {
                        OrderId = orderId,
                        item.ProductId,
                        item.Quantity,
                        item.UnitPrice
                    }, transaction);
                }

                transaction.Commit();
                return orderId;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<IEnumerable<Order>> GetAllForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"""
            SELECT {OrderColumns} FROM "Orders" WHERE "UserId" = @UserId ORDER BY "CreatedAt" DESC
            """;
            return await connection.QueryAsync<Order>(sql, new { UserId = userId });
        }

        public async Task<Order?> GetByIdAsync(int orderId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"""
            SELECT {OrderColumns} FROM "Orders" WHERE "OrderId" = @OrderId AND "UserId" = @UserId
            """;
            return await connection.QuerySingleOrDefaultAsync<Order>(sql, new { OrderId = orderId, UserId = userId });
        }

        public async Task<Order?> GetByPaymentReferenceAsync(string paymentReference)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"""SELECT {OrderColumns} FROM "Orders" WHERE "PaymentReference" = @PaymentReference""";
            return await connection.QuerySingleOrDefaultAsync<Order>(sql, new { PaymentReference = paymentReference });
        }

        public async Task<Order?> GetByPaymentIntentIdAsync(string paymentIntentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"""SELECT {OrderColumns} FROM "Orders" WHERE "PaymentIntentId" = @PaymentIntentId""";
            return await connection.QuerySingleOrDefaultAsync<Order>(sql, new { PaymentIntentId = paymentIntentId });
        }

        public async Task<IEnumerable<OrderItemWithProduct>> GetItemsForOrderAsync(int orderId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            SELECT oi."OrderItemId", oi."OrderId", oi."ProductId", p."Name" AS "ProductName",
                   p."ImageUrl", oi."Quantity", oi."UnitPrice"
            FROM "OrderItems" oi
            JOIN "Products" p ON p."ProductId" = oi."ProductId"
            WHERE oi."OrderId" = @OrderId
            """;
            return await connection.QueryAsync<OrderItemWithProduct>(sql, new { OrderId = orderId });
        }

        public async Task<IEnumerable<OrderWithUser>> GetAllOrdersAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"""
            SELECT o."OrderId", o."UserId", o."PaymentStatus", o."FulfillmentStatus", o."TotalAmount",
                   o."ShippingAddress", o."PaymentReference", o."PaymentIntentId", o."CreatedAt", o."UpdatedAt",
                   u."Email" AS "UserEmail", u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName"
            FROM "Orders" o
            JOIN "Users" u ON u."UserId" = o."UserId"
            ORDER BY o."CreatedAt" DESC
            """;
            return await connection.QueryAsync<OrderWithUser>(sql);
        }

        public async Task<OrderWithUser?> GetByIdForAdminAsync(int orderId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"""
            SELECT o."OrderId", o."UserId", o."PaymentStatus", o."FulfillmentStatus", o."TotalAmount",
                   o."ShippingAddress", o."PaymentReference", o."PaymentIntentId", o."CreatedAt", o."UpdatedAt",
                   u."Email" AS "UserEmail", u."FirstName" AS "UserFirstName", u."LastName" AS "UserLastName"
            FROM "Orders" o
            JOIN "Users" u ON u."UserId" = o."UserId"
            WHERE o."OrderId" = @OrderId
            """;
            return await connection.QuerySingleOrDefaultAsync<OrderWithUser>(sql, new { OrderId = orderId });
        }

        public async Task<bool> UpdateFulfillmentStatusAsync(int orderId, string fulfillmentStatus)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Orders" SET "FulfillmentStatus" = @FulfillmentStatus, "UpdatedAt" = NOW()
            WHERE "OrderId" = @OrderId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { OrderId = orderId, FulfillmentStatus = fulfillmentStatus });
            return rowsAffected > 0;
        }

        public async Task<bool> UpdatePaymentStatusAsync(int orderId, string paymentStatus)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
            UPDATE "Orders" SET "PaymentStatus" = @PaymentStatus, "UpdatedAt" = NOW()
            WHERE "OrderId" = @OrderId
            """;
            var rowsAffected = await connection.ExecuteAsync(sql, new { OrderId = orderId, PaymentStatus = paymentStatus });
            return rowsAffected > 0;
        }

        public async Task CancelOrderAsync(int orderId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            connection.Open();
            using var transaction = connection.BeginTransaction();

            try
            {
                const string lockOrderSql = """
                SELECT "FulfillmentStatus" FROM "Orders"
                WHERE "OrderId" = @OrderId AND "UserId" = @UserId
                FOR UPDATE
                """;
                var currentStatus = await connection.QuerySingleOrDefaultAsync<string?>(
                    lockOrderSql, new { OrderId = orderId, UserId = userId }, transaction);

                if (currentStatus is null)
                    throw new InvalidOperationException("Order not found.");

                // "Confirmed" is now the initial fulfillment state (renamed from "Pending") —
                // cancellation is only allowed before anything has shipped.
                if (currentStatus != "Confirmed")
                    throw new InvalidOperationException(
                        $"This order can no longer be cancelled — its status is '{currentStatus}'.");

                const string itemsSql = """
                SELECT "ProductId", "Quantity" FROM "OrderItems" WHERE "OrderId" = @OrderId
                """;
                var items = (await connection.QueryAsync<(int ProductId, int Quantity)>(
                    itemsSql, new { OrderId = orderId }, transaction)).ToList();

                const string restockSql = """
                UPDATE "Products" SET "StockQuantity" = "StockQuantity" + @Quantity
                WHERE "ProductId" = @ProductId
                """;
                foreach (var item in items)
                {
                    await connection.ExecuteAsync(restockSql, new { item.ProductId, item.Quantity }, transaction);
                }

                const string updateStatusSql = """
                UPDATE "Orders" SET "FulfillmentStatus" = 'Cancelled', "UpdatedAt" = NOW()
                WHERE "OrderId" = @OrderId
                """;
                await connection.ExecuteAsync(updateStatusSql, new { OrderId = orderId }, transaction);

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<bool> DeleteOrderAsync(int orderId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """DELETE FROM "Orders" WHERE "OrderId" = @OrderId""";
            var rowsAffected = await connection.ExecuteAsync(sql, new { OrderId = orderId });
            return rowsAffected > 0;
        }
    }
}
