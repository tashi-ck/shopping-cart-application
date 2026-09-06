using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Services
{
    public class LowStockAlertService : ILowStockAlertService
    {
        private const int Threshold = 5; // matches the admin dashboard's existing LOW_STOCK_THRESHOLD

        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly INotificationRepository _notificationRepository;

        public LowStockAlertService(
            IUserRepository userRepository, IEmailService emailService, INotificationRepository notificationRepository)
        {
            _userRepository = userRepository;
            _emailService = emailService;
            _notificationRepository = notificationRepository;
        }

        public async Task CheckAndNotifyAsync(int productId, string productName, int previousStock, int newStock)
        {
            // Only fires on the CROSSING moment — going from at/above threshold down to below it.
            // A further decrease while already below threshold (or a restock back up) never re-fires,
            // which is what stops this from spamming an admin on every single subsequent sale.
            var justCrossed = previousStock >= Threshold && newStock < Threshold;
            if (!justCrossed) return;

            var admins = (await _userRepository.GetAdminUsersAsync()).ToList();
            if (admins.Count == 0) return;

            var message = $"{productName} has dropped to {newStock} units (threshold: {Threshold}).";

            foreach (var admin in admins)
            {
                await _notificationRepository.CreateAsync(new Notification
                {
                    UserId = admin.UserId,
                    Type = "LowStock",
                    Message = message,
                    ProductId = productId
                });

                try
                {
                    await _emailService.SendLowStockAlertAsync(admin.Email, productName, newStock, Threshold);
                }
                catch (Exception ex)
                {
                    // Same reasoning as every other email in this app: a failed email send
                    // should never prevent the notification (or the underlying stock change)
                    // from succeeding — the in-app notification is the reliable fallback here.
                    Console.WriteLine($"Failed to send low-stock email to {admin.Email}: {ex.Message}");
                }
            }
        }
    }
}
