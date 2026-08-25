using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByAuth0IdAsync(string auth0Id);
        Task<User> CreateAsync(User user);
        Task UpdateProfileAsync(User user);
        Task<User?> GetByIdAsync(int userId);
        Task<IEnumerable<UserWithOrderCount>> GetAllForAdminAsync();
        Task<bool> SetActiveAsync(int userId, bool isActive);
        Task<bool> DeleteAsync(int userId);
    }
}
