using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.NotificationDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface INotificationService
    {
        Task<IEnumerable<NotificationDto>> GetNotificationsAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int userId, int notificationId);
        Task MarkAllAsReadAsync(int userId);
    }
}
