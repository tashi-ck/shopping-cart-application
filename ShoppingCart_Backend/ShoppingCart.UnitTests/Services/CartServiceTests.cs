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
using static ShoppingCart.Application.DTOs.CartDtos;

namespace ShoppingCart.UnitTests.Services
{
    public class CartServiceTests
    {
        private readonly Mock<ICartRepository> _cartRepositoryMock = new();
        private readonly Mock<ICartItemRepository> _cartItemRepositoryMock = new();
        private readonly Mock<IProductRepository> _productRepositoryMock = new();
        private readonly CartService _cartService;

        public CartServiceTests()
        {
            _cartService = new CartService(_cartRepositoryMock.Object, _cartItemRepositoryMock.Object, _productRepositoryMock.Object);
        }

        private static ProductWithCategory MakeProduct(int id, decimal price, int stock) => new()
        {
            ProductId = id,
            Name = "Widget",
            CategoryName = "Test",
            Price = price,
            StockQuantity = stock,
            IsActive = true
        };

        [Fact]
        public async Task AddItemAsync_NoExistingCart_CreatesOneFirst()
        {
            var product = MakeProduct(1, 10m, 5);
            _productRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(product);
            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(99)).ReturnsAsync((Cart?)null);
            _cartRepositoryMock.Setup(r => r.CreateAsync(99)).ReturnsAsync(new Cart { CartId = 7, UserId = 99 });
            _cartItemRepositoryMock.Setup(r => r.GetByCartAndProductAsync(7, 1)).ReturnsAsync((CartItem?)null);
            _cartItemRepositoryMock.Setup(r => r.GetAllForCartAsync(7)).ReturnsAsync(new List<CartItemWithProduct>());

            await _cartService.AddItemAsync(99, new AddCartItemDto(1, 2));

            _cartRepositoryMock.Verify(r => r.CreateAsync(99), Times.Once);
            _cartItemRepositoryMock.Verify(r => r.CreateAsync(It.Is<CartItem>(ci => ci.CartId == 7 && ci.ProductId == 1 && ci.Quantity == 2)), Times.Once);
        }

        [Fact]
        public async Task AddItemAsync_ProductAlreadyInCart_MergesQuantityInsteadOfDuplicating()
        {
            var product = MakeProduct(1, 10m, 10);
            var cart = new Cart { CartId = 7, UserId = 99 };
            var existingItem = new CartItem { CartItemId = 3, CartId = 7, ProductId = 1, Quantity = 2 };

            _productRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(product);
            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(99)).ReturnsAsync(cart);
            _cartItemRepositoryMock.Setup(r => r.GetByCartAndProductAsync(7, 1)).ReturnsAsync(existingItem);
            _cartItemRepositoryMock.Setup(r => r.GetAllForCartAsync(7)).ReturnsAsync(new List<CartItemWithProduct>());

            await _cartService.AddItemAsync(99, new AddCartItemDto(1, 3));

            // 2 already in cart + 3 more requested = 5 total — must UPDATE the existing row, never CREATE a second one
            _cartItemRepositoryMock.Verify(r => r.UpdateQuantityAsync(3, 7, 5), Times.Once);
            _cartItemRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<CartItem>()), Times.Never);
        }

        [Fact]
        public async Task AddItemAsync_MergedQuantityExceedsStock_Throws()
        {
            var product = MakeProduct(1, 10m, 4); // only 4 in stock
            var cart = new Cart { CartId = 7, UserId = 99 };
            var existingItem = new CartItem { CartItemId = 3, CartId = 7, ProductId = 1, Quantity = 3 }; // already have 3

            _productRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(product);
            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(99)).ReturnsAsync(cart);
            _cartItemRepositoryMock.Setup(r => r.GetByCartAndProductAsync(7, 1)).ReturnsAsync(existingItem);

            // Requesting 2 more would total 5, but only 4 exist — this is the exact
            // "already in cart + new request" check, not just checking 2 alone against stock
            var act = async () => await _cartService.AddItemAsync(99, new AddCartItemDto(1, 2));

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Only 4*");
            _cartItemRepositoryMock.Verify(r => r.UpdateQuantityAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task UpdateItemQuantityAsync_ItemBelongsToDifferentCart_Throws()
        {
            var cart = new Cart { CartId = 7, UserId = 99 };
            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(99)).ReturnsAsync(cart);

            // Simulates the repository's own WHERE CartItemId = X AND CartId = Y finding nothing —
            // i.e. this cart item belongs to someone else's cart
            _cartItemRepositoryMock.Setup(r => r.GetByIdAndCartAsync(55, 7)).ReturnsAsync((CartItem?)null);

            var act = async () => await _cartService.UpdateItemQuantityAsync(99, 55, 1);

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
        }

        [Fact]
        public async Task UpdateItemQuantityAsync_ZeroOrNegative_Throws()
        {
            var act = async () => await _cartService.UpdateItemQuantityAsync(99, 1, 0);

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*greater than zero*");
        }
    }
}
