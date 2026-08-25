using FluentAssertions;
using Moq;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Services;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.UserDtos;

namespace ShoppingCart.UnitTests.Services
{
    public class UserServiceTests
    {
        private readonly Mock<IUserRepository> _userRepositoryMock = new();
        private readonly UserService _userService;

        public UserServiceTests()
        {
            _userService = new UserService(_userRepositoryMock.Object);
        }

        [Fact]
        public async Task GetOrCreateUserAsync_NewAuth0Id_CreatesUser()
        {
            var profile = new Auth0ProfileDto("auth0|new123", "new@example.com", "New", "User");

            _userRepositoryMock.Setup(r => r.GetByAuth0IdAsync(profile.Auth0Id)).ReturnsAsync((User?)null);
            _userRepositoryMock
                .Setup(r => r.CreateAsync(It.IsAny<User>()))
                .ReturnsAsync((User u) => { u.UserId = 1; u.IsActive = true; return u; });

            var result = await _userService.GetOrCreateUserAsync(profile);

            result.UserId.Should().Be(1);
            result.Email.Should().Be("new@example.com");
            _userRepositoryMock.Verify(r => r.CreateAsync(It.Is<User>(u => u.Auth0Id == profile.Auth0Id)), Times.Once);
        }

        [Fact]
        public async Task GetOrCreateUserAsync_DeactivatedUser_ThrowsUnauthorized()
        {
            var profile = new Auth0ProfileDto("auth0|abc", "user@example.com", "A", "B");
            var existing = new User { UserId = 5, Auth0Id = profile.Auth0Id, Email = profile.Email, IsActive = false };

            _userRepositoryMock.Setup(r => r.GetByAuth0IdAsync(profile.Auth0Id)).ReturnsAsync(existing);

            var act = async () => await _userService.GetOrCreateUserAsync(profile);

            await act.Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*deactivated*");

            // Confirms a deactivated user is blocked BEFORE any profile sync or update happens
            _userRepositoryMock.Verify(r => r.UpdateProfileAsync(It.IsAny<User>()), Times.Never);
        }

        [Fact]
        public async Task GetOrCreateUserAsync_ExistingUser_UnchangedProfile_DoesNotWrite()
        {
            var profile = new Auth0ProfileDto("auth0|abc", "same@example.com", "Same", "Name");
            var existing = new User
            {
                UserId = 5,
                Auth0Id = profile.Auth0Id,
                Email = "same@example.com",
                FirstName = "Same",
                LastName = "Name",
                IsActive = true
            };

            _userRepositoryMock.Setup(r => r.GetByAuth0IdAsync(profile.Auth0Id)).ReturnsAsync(existing);

            await _userService.GetOrCreateUserAsync(profile);

            // Same reasoning as the ToDo app's UpdateProfileAsync email check —
            // no point writing to the DB when nothing actually changed
            _userRepositoryMock.Verify(r => r.UpdateProfileAsync(It.IsAny<User>()), Times.Never);
        }

        [Fact]
        public async Task GetOrCreateUserAsync_ExistingUser_ChangedEmail_SyncsProfile()
        {
            var profile = new Auth0ProfileDto("auth0|abc", "updated@example.com", "Same", "Name");
            var existing = new User
            {
                UserId = 5,
                Auth0Id = profile.Auth0Id,
                Email = "old@example.com",
                FirstName = "Same",
                LastName = "Name",
                IsActive = true
            };

            _userRepositoryMock.Setup(r => r.GetByAuth0IdAsync(profile.Auth0Id)).ReturnsAsync(existing);

            var result = await _userService.GetOrCreateUserAsync(profile);

            result.Email.Should().Be("updated@example.com");
            _userRepositoryMock.Verify(
                r => r.UpdateProfileAsync(It.Is<User>(u => u.Email == "updated@example.com")),
                Times.Once
            );
        }
    }
}
