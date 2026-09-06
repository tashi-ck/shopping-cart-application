using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.NotificationDtos;

namespace ShoppingCart.Application.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        public NotificationService(INotificationRepository notificationRepository) => _notificationRepository = notificationRepository;

        public async Task<IEnumerable<NotificationDto>> GetNotificationsAsync(int userId)
        {
            var notifications = await _notificationRepository.GetForUserAsync(userId);
            return notifications.Select(MapToDto);
        }

        public Task<int> GetUnreadCountAsync(int userId) => _notificationRepository.GetUnreadCountAsync(userId);

        public Task<bool> MarkAsReadAsync(int userId, int notificationId) =>
            _notificationRepository.MarkAsReadAsync(notificationId, userId);

        public Task MarkAllAsReadAsync(int userId) => _notificationRepository.MarkAllAsReadAsync(userId);

        private static NotificationDto MapToDto(Notification n) =>
            new(n.NotificationId, n.Type, n.Message, n.ProductId, n.IsRead, n.CreatedAt);
    }
}
