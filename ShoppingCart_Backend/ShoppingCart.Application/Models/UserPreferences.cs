using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Models
{
    public record UserPreferences(
        List<int> PreferredCategoryIds,
        decimal? MinBudget,
        decimal? MaxBudget,
        string? ShoppingPriority
    );
}
