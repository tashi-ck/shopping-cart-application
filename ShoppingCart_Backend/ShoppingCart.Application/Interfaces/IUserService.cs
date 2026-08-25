using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.UserDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IUserService
    {
        Task<UserDto> GetOrCreateUserAsync(Auth0ProfileDto profile);
        Task<UserDto?> GetProfileByIdAsync(int userId);
        Task<IEnumerable<AdminUserDto>> GetAllUsersForAdminAsync();
        Task<bool> SetUserActiveAsync(int userId, bool isActive);
        Task<bool> DeleteUserAsync(int userId);

    }
}
