using Dapper;
using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.DashboardDtos;

namespace ShoppingCart.Infrastructure.Repositories
{
    public class DashboardRepository : IDashboardRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public DashboardRepository(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        public async Task<DashboardDto> GetDashboardAsync(int lowStockThreshold)
        {
            using var connection = _connectionFactory.CreateConnection();

            // "Real" revenue: paid and not cancelled (cancelled orders get refunded).
            const string orderSummarySql = """
            SELECT
                COALESCE(SUM("TotalAmount") FILTER (WHERE "PaymentStatus" = 'Paid' AND "FulfillmentStatus" <> 'Cancelled'), 0) AS "TotalRevenue",
                COALESCE(SUM("TotalAmount") FILTER (WHERE "PaymentStatus" = 'Paid' AND "FulfillmentStatus" <> 'Cancelled'
                    AND "CreatedAt" >= NOW() - INTERVAL '30 days'), 0) AS "RevenueLast30Days",
                COALESCE(SUM("TotalAmount") FILTER (WHERE "PaymentStatus" = 'Paid' AND "FulfillmentStatus" <> 'Cancelled'
                    AND "CreatedAt" >= NOW() - INTERVAL '60 days' AND "CreatedAt" < NOW() - INTERVAL '30 days'), 0) AS "RevenuePrev30Days",
                COUNT(*)::int AS "TotalOrders",
                (COUNT(*) FILTER (WHERE "CreatedAt" >= NOW() - INTERVAL '30 days'))::int AS "OrdersLast30Days",
                (COUNT(*) FILTER (WHERE "CreatedAt" >= NOW() - INTERVAL '60 days'
                    AND "CreatedAt" < NOW() - INTERVAL '30 days'))::int AS "OrdersPrev30Days",
                (COUNT(*) FILTER (WHERE "FulfillmentStatus" = 'Confirmed'))::int AS "PendingFulfillment"
            FROM "Orders"
            """;
            var summary = await connection.QuerySingleAsync<DashboardSummaryDto>(orderSummarySql);

            const string customerSql = """
            SELECT
                COUNT(*)::int AS "TotalCustomers",
                (COUNT(*) FILTER (WHERE "CreatedAt" >= NOW() - INTERVAL '30 days'))::int AS "NewCustomersLast30Days",
                (COUNT(*) FILTER (WHERE "CreatedAt" >= NOW() - INTERVAL '60 days'
                    AND "CreatedAt" < NOW() - INTERVAL '30 days'))::int AS "NewCustomersPrev30Days"
            FROM "Users"
            WHERE COALESCE("IsGuest", FALSE) = FALSE AND "IsAdmin" = FALSE
            """;
            var customers = await connection.QuerySingleAsync<DashboardSummaryDto>(customerSql);
            summary.TotalCustomers = customers.TotalCustomers;
            summary.NewCustomersLast30Days = customers.NewCustomersLast30Days;
            summary.NewCustomersPrev30Days = customers.NewCustomersPrev30Days;

            const string catalogSql = """
            SELECT
                (COUNT(*) FILTER (WHERE "IsActive" = TRUE))::int AS "ActiveProducts",
                (COUNT(*) FILTER (WHERE "IsActive" = TRUE AND "StockQuantity" < @Threshold))::int AS "LowStockCount",
                COALESCE(SUM("Price" * "StockQuantity") FILTER (WHERE "IsActive" = TRUE), 0) AS "InventoryValue"
            FROM "Products"
            """;
            var catalog = await connection.QuerySingleAsync<DashboardSummaryDto>(catalogSql, new { Threshold = lowStockThreshold });
            summary.ActiveProducts = catalog.ActiveProducts;
            summary.LowStockCount = catalog.LowStockCount;
            summary.InventoryValue = catalog.InventoryValue;

            summary.TotalCategories = await connection.QuerySingleAsync<int>("""SELECT COUNT(*)::int FROM "Categories" """);
            summary.PendingReviews = await connection.QuerySingleAsync<int>(
                """SELECT COUNT(*)::int FROM "Reviews" WHERE "ModerationStatus" = 'Pending' """);

            const string chatSql = """
            SELECT
                (COUNT(*) FILTER (WHERE "Feedback" = TRUE))::int AS "ChatHelpful",
                (COUNT(*) FILTER (WHERE "Feedback" = FALSE))::int AS "ChatNotHelpful"
            FROM "ChatLogs"
            """;
            var chat = await connection.QuerySingleAsync<DashboardSummaryDto>(chatSql);
            summary.ChatHelpful = chat.ChatHelpful;
            summary.ChatNotHelpful = chat.ChatNotHelpful;

            // generate_series guarantees a row for every day, even days with zero sales.
            const string revenueByDaySql = """
            SELECT to_char(d, 'YYYY-MM-DD') AS "Date",
                   COALESCE(SUM(o."TotalAmount"), 0) AS "Revenue",
                   COUNT(o."OrderId")::int AS "Orders"
            FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d
            LEFT JOIN "Orders" o
                   ON o."CreatedAt"::date = d::date
                  AND o."PaymentStatus" = 'Paid' AND o."FulfillmentStatus" <> 'Cancelled'
            GROUP BY d
            ORDER BY d
            """;
            var revenueByDay = (await connection.QueryAsync<DailyRevenueDto>(revenueByDaySql)).ToList();

            const string statusSql = """
            SELECT "FulfillmentStatus" AS "Status", COUNT(*)::int AS "Count"
            FROM "Orders"
            GROUP BY "FulfillmentStatus"
            """;
            var ordersByStatus = (await connection.QueryAsync<StatusCountDto>(statusSql)).ToList();

            const string topProductsSql = """
            SELECT p."ProductId", p."Name", p."ImageUrl",
                   SUM(oi."Quantity")::int AS "UnitsSold",
                   SUM(oi."Quantity" * oi."UnitPrice") AS "Revenue"
            FROM "OrderItems" oi
            JOIN "Orders" o ON o."OrderId" = oi."OrderId"
            JOIN "Products" p ON p."ProductId" = oi."ProductId"
            WHERE o."PaymentStatus" = 'Paid' AND o."FulfillmentStatus" <> 'Cancelled'
            GROUP BY p."ProductId", p."Name", p."ImageUrl"
            ORDER BY "UnitsSold" DESC, "Revenue" DESC
            LIMIT 5
            """;
            var topProducts = (await connection.QueryAsync<TopProductDto>(topProductsSql)).ToList();

            const string recentOrdersSql = """
            SELECT o."OrderId", u."Email" AS "CustomerEmail", u."FirstName" AS "CustomerFirstName",
                   u."LastName" AS "CustomerLastName", o."TotalAmount", o."PaymentStatus",
                   o."FulfillmentStatus", o."CreatedAt"
            FROM "Orders" o
            JOIN "Users" u ON u."UserId" = o."UserId"
            ORDER BY o."CreatedAt" DESC
            LIMIT 6
            """;
            var recentOrders = (await connection.QueryAsync<RecentOrderDto>(recentOrdersSql)).ToList();

            const string lowStockSql = """
            SELECT "ProductId", "Name", "StockQuantity"
            FROM "Products"
            WHERE "IsActive" = TRUE AND "StockQuantity" < @Threshold
            ORDER BY "StockQuantity" ASC, "Name" ASC
            LIMIT 8
            """;
            var lowStock = (await connection.QueryAsync<LowStockProductDto>(lowStockSql, new { Threshold = lowStockThreshold })).ToList();

            return new DashboardDto
            {
                Summary = summary,
                RevenueByDay = revenueByDay,
                OrdersByStatus = ordersByStatus,
                TopProducts = topProducts,
                RecentOrders = recentOrders,
                LowStock = lowStock
            };
        }
    }
}
