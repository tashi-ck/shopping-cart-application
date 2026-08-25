using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface ICartItemRepository
    {
        Task<IEnumerable<CartItemWithProduct>> GetAllForCartAsync(int cartId);
        Task<CartItem?> GetByIdAndCartAsync(int cartItemId, int cartId);
        Task<CartItem?> GetByCartAndProductAsync(int cartId, int productId);
        Task<CartItem> CreateAsync(CartItem item);
        Task<bool> UpdateQuantityAsync(int cartItemId, int cartId, int quantity);
        Task<bool> DeleteAsync(int cartItemId, int cartId);
        Task DeleteAllForCartAsync(int cartId);
    }
}
