using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class UserDtos
    {
        public record UserDto(
            int UserId, 
            string Email, 
            string? FirstName, 
            string? LastName, 
            bool IsActive
        );

        public record Auth0ProfileDto(
            string Auth0Id, 
            string Email, 
            string? FirstName, 
            string? LastName
        );

        public record UpdateUserDto(string FirstName, string LastName, string Email);

        public record AdminUserDto(
            int UserId, string Email, string? FirstName, string? LastName,
            bool IsActive, int OrderCount, DateTime CreatedAt
        );

        public record SetUserActiveDto(bool IsActive);
    }
}
