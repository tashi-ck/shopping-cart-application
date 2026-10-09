using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class DashboardDtos
    {
        public class DashboardSummaryDto
        {
            public decimal TotalRevenue { get; set; }
            public decimal RevenueLast30Days { get; set; }
            public decimal RevenuePrev30Days { get; set; }
            public int TotalOrders { get; set; }
            public int OrdersLast30Days { get; set; }
            public int OrdersPrev30Days { get; set; }
            public int PendingFulfillment { get; set; }

            public int TotalCustomers { get; set; }
            public int NewCustomersLast30Days { get; set; }
            public int NewCustomersPrev30Days { get; set; }

            public int ActiveProducts { get; set; }
            public int TotalCategories { get; set; }
            public int LowStockCount { get; set; }
            public decimal InventoryValue { get; set; }

            public int PendingReviews { get; set; }
            public int ChatHelpful { get; set; }
            public int ChatNotHelpful { get; set; }
        }

        public class DailyRevenueDto
        {
            public string Date { get; set; } = string.Empty; // "yyyy-MM-dd"
            public decimal Revenue { get; set; }
            public int Orders { get; set; }
        }

        public class StatusCountDto
        {
            public string Status { get; set; } = string.Empty;
            public int Count { get; set; }
        }

        public class TopProductDto
        {
            public int ProductId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public int UnitsSold { get; set; }
            public decimal Revenue { get; set; }
        }

        public class RecentOrderDto
        {
            public int OrderId { get; set; }
            public string CustomerEmail { get; set; } = string.Empty;
            public string? CustomerFirstName { get; set; }
            public string? CustomerLastName { get; set; }
            public decimal TotalAmount { get; set; }
            public string PaymentStatus { get; set; } = string.Empty;
            public string FulfillmentStatus { get; set; } = string.Empty;
            public System.DateTime CreatedAt { get; set; }
        }

        public class LowStockProductDto
        {
            public int ProductId { get; set; }
            public string Name { get; set; } = string.Empty;
            public int StockQuantity { get; set; }
        }

        public class DashboardDto
        {
            public DashboardSummaryDto Summary { get; set; } = new();
            public List<DailyRevenueDto> RevenueByDay { get; set; } = new();
            public List<StatusCountDto> OrdersByStatus { get; set; } = new();
            public List<TopProductDto> TopProducts { get; set; } = new();
            public List<RecentOrderDto> RecentOrders { get; set; } = new();
            public List<LowStockProductDto> LowStock { get; set; } = new();
        }
    }
}
