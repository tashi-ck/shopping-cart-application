using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.DashboardDtos;

namespace ShoppingCart.Application.Services
{
    public class DashboardService : IDashboardService
    {
        // Matches LowStockAlertService.Threshold and the old dashboard's LOW_STOCK_THRESHOLD.
        private const int LowStockThreshold = 5;

        private readonly IDashboardRepository _dashboardRepository;
        public DashboardService(IDashboardRepository dashboardRepository) => _dashboardRepository = dashboardRepository;

        public Task<DashboardDto> GetDashboardAsync() =>
            _dashboardRepository.GetDashboardAsync(LowStockThreshold);
    }
}
