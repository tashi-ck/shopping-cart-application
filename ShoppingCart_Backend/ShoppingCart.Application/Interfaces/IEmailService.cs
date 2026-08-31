using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.OrderDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendOrderConfirmationAsync(string toEmail, OrderDto order);
    }
}
