using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IProductImageRepository
    {
        Task<IEnumerable<ProductImage>> GetAllForProductAsync(int productId);
        Task<ProductImage> CreateAsync(ProductImage image);
        Task<bool> DeleteAsync(int productImageId, int productId);
        Task ReorderAsync(int productId, List<int> orderedProductImageIds);
    }
}
