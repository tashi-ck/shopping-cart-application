using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : AuthenticatedControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService, IUserService userService) : base(userService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userId = await GetCurrentUserIdAsync();
            var notifications = await _notificationService.GetNotificationsAsync(userId);
            return Ok(notifications);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = await GetCurrentUserIdAsync();
            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(new { count });
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = await GetCurrentUserIdAsync();
            var updated = await _notificationService.MarkAsReadAsync(userId, id);
            return updated ? NoContent() : NotFound();
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = await GetCurrentUserIdAsync();
            await _notificationService.MarkAllAsReadAsync(userId);
            return NoContent();
        }
    }
}
