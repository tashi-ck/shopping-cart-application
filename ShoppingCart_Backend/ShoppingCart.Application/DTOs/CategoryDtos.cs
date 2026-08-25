using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class CategoryDtos
    {
        public record CategoryDto(int CategoryId, string Name, string? Description);

        public record CreateCategoryDto(string Name, string? Description);

        public record UpdateCategoryDto(string Name, string? Description);
    }
}
