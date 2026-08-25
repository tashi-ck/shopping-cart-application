using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.UserDtos;

namespace ShoppingCart.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        public UserService(IUserRepository userRepository) => _userRepository = userRepository;

        public async Task<UserDto> GetOrCreateUserAsync(Auth0ProfileDto profile)
        {
            var existing = await _userRepository.GetByAuth0IdAsync(profile.Auth0Id);

            if (existing is not null)
            {
                if (!existing.IsActive)
                    throw new UnauthorizedAccessException("This account has been deactivated. Contact support for help.");

                var hasChanges = existing.Email != profile.Email
                    || existing.FirstName != profile.FirstName
                    || existing.LastName != profile.LastName;

                if (hasChanges)
                {
                    existing.Email = profile.Email;
                    existing.FirstName = profile.FirstName;
                    existing.LastName = profile.LastName;
                    await _userRepository.UpdateProfileAsync(existing);
                }

                return new UserDto(existing.UserId, existing.Email, existing.FirstName, existing.LastName, existing.IsActive);
            }

            var newUser = new User
            {
                Auth0Id = profile.Auth0Id,
                Email = profile.Email,
                FirstName = profile.FirstName,
                LastName = profile.LastName
            };

            var created = await _userRepository.CreateAsync(newUser);
            return new UserDto(created.UserId, created.Email, created.FirstName, created.LastName, created.IsActive);
        }

        public async Task<UserDto?> GetProfileByIdAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            return user is null ? null : new UserDto(user.UserId, user.Email, user.FirstName, user.LastName, user.IsActive);
        }

        public async Task<IEnumerable<AdminUserDto>> GetAllUsersForAdminAsync()
        {
            var users = await _userRepository.GetAllForAdminAsync();
            return users.Select(u => new AdminUserDto(
                u.UserId, u.Email, u.FirstName, u.LastName, u.IsActive, u.OrderCount, u.CreatedAt
            ));
        }

        public Task<bool> SetUserActiveAsync(int userId, bool isActive) =>
            _userRepository.SetActiveAsync(userId, isActive);

        public Task<bool> DeleteUserAsync(int userId) =>
            _userRepository.DeleteAsync(userId);
    }
}
