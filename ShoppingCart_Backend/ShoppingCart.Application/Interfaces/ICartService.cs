using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.CartDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface ICartService
    {
        Task<CartDto> GetCartAsync(int userId);
        Task<CartDto> AddItemAsync(int userId, AddCartItemDto dto);
        Task<bool> UpdateItemQuantityAsync(int userId, int cartItemId, int quantity);
        Task<bool> RemoveItemAsync(int userId, int cartItemId);
    }
}
