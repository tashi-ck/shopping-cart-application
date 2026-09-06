using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface ILowStockAlertService
    {
        Task CheckAndNotifyAsync(int productId, string productName, int previousStock, int newStock);
    }
}
