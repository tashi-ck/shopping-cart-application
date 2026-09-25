using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class OnboardingDtos
    {
        public record SubmitOnboardingDto(
            List<int> PreferredCategoryIds,
            decimal? MinBudget,
            decimal? MaxBudget,
            string ShoppingPriority // "Price" | "Quality" | "Trending"
        );
    }
}
