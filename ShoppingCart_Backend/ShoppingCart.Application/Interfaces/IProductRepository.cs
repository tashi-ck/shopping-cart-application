using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IProductRepository
    {
        Task<IEnumerable<ProductWithCategory>> GetAllAsync(int? categoryId = null, string? search = null, string? sortBy = null, bool includeInactive = false);
        Task<ProductWithCategory?> GetByIdAsync(int productId);
        Task<Product> CreateAsync(Product product);
        Task<bool> UpdateAsync(Product product);
        Task<bool> DeleteAsync(int productId);
        Task<bool> SetActiveAsync(int productId, bool isActive);
    }
}
