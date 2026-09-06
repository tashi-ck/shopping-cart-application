using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class NotificationDtos
    {
        public record NotificationDto(int NotificationId, string Type, string Message, int? ProductId, bool IsRead, DateTime CreatedAt);
    }
}
