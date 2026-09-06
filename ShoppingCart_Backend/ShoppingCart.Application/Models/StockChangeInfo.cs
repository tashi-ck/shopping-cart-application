using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Models
{
    // Deliberately carries the raw before/after numbers, not a "crossed threshold" boolean —
    // the threshold is a BUSINESS rule and belongs in the Application layer (LowStockAlertService),
    // not baked into Infrastructure's raw SQL.
    public record StockChangeInfo(int ProductId, string ProductName, int PreviousStock, int NewStock);
}
