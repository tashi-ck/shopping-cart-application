using FluentAssertions;
using Moq;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using ShoppingCart.Application.Services;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using static ShoppingCart.Application.DTOs.OrderDtos;

namespace ShoppingCart.UnitTests.Services
{
    public class OrderServiceTests
    {
        private readonly Mock<IOrderRepository> _orderRepositoryMock = new();
        private readonly Mock<ICartRepository> _cartRepositoryMock = new();
        private readonly Mock<ICartItemRepository> _cartItemRepositoryMock = new();
        private readonly Mock<IProductRepository> _productRepositoryMock = new();
        private readonly Mock<IPaymentService> _paymentServiceMock = new();
        private readonly Mock<IUserRepository> _userRepositoryMock = new();
        private readonly Mock<IEmailService> _emailServiceMock = new();
        private readonly Mock<ILowStockAlertService> _lowStockAlertServiceMock = new();

        private readonly OrderService _orderService;

        public OrderServiceTests()
        {
            _orderService = new OrderService(
                _orderRepositoryMock.Object,
                _cartRepositoryMock.Object,
                _cartItemRepositoryMock.Object,
                _productRepositoryMock.Object,
                _paymentServiceMock.Object,
                _userRepositoryMock.Object,
                _emailServiceMock.Object,
                _lowStockAlertServiceMock.Object);
        }

        [Fact]
        public async Task CheckoutCartAsync_NoCart_Throws()
        {
            // Arrange
            _cartRepositoryMock
                .Setup(r => r.GetByUserIdAsync(1))
                .ReturnsAsync((Cart?)null);

            // Act
            var act = async () =>
                await _orderService.CheckoutCartAsync(
                    1,
                    new CheckoutDto("123 Main St"));

            // Assert
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*empty*");

            _orderRepositoryMock.Verify(
                r => r.CreateOrderWithItemsAsync(
                    It.IsAny<int>(),
                    It.IsAny<string>(),
                    It.IsAny<List<OrderItemInput>>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task CheckoutCartAsync_EmptyCart_Throws()
        {
            // Arrange
            _cartRepositoryMock
                .Setup(r => r.GetByUserIdAsync(1))
                .ReturnsAsync(new Cart
                {
                    CartId = 5,
                    UserId = 1
                });

            _cartItemRepositoryMock
                .Setup(r => r.GetAllForCartAsync(5))
                .ReturnsAsync(new List<CartItemWithProduct>());

            // Act
            var act = async () =>
                await _orderService.CheckoutCartAsync(
                    1,
                    new CheckoutDto("123 Main St"));

            // Assert
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*empty*");

            _orderRepositoryMock.Verify(
                r => r.CreateOrderWithItemsAsync(
                    It.IsAny<int>(),
                    It.IsAny<string>(),
                    It.IsAny<List<OrderItemInput>>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>()),
                Times.Never);

            _cartItemRepositoryMock.Verify(
                r => r.DeleteAllForCartAsync(It.IsAny<int>()),
                Times.Never);
        }

        [Fact]
        public async Task CheckoutCartAsync_Success_ClearsCartOnlyAfterOrderCreated()
        {
            // Arrange
            var cart = new Cart
            {
                CartId = 5,
                UserId = 1
            };

            var cartItems = new List<CartItemWithProduct>
            {
                new()
                {
                    CartItemId = 1,
                    CartId = 5,
                    ProductId = 10,
                    ProductName = "Widget",
                    UnitPrice = 20m,
                    Quantity = 2,
                    StockQuantity = 10
                }
            };

            _cartRepositoryMock
                .Setup(r => r.GetByUserIdAsync(1))
                .ReturnsAsync(cart);

            _cartItemRepositoryMock
                .Setup(r => r.GetAllForCartAsync(5))
                .ReturnsAsync(cartItems);

            _orderRepositoryMock
                .Setup(r => r.CreateOrderWithItemsAsync(
                    1,
                    "123 Main St",
                    It.IsAny<List<OrderItemInput>>(),
                    null,
                    null))
                .ReturnsAsync((
                    42,
                    new List<StockChangeInfo>()
                ));

            _orderRepositoryMock
                .Setup(r => r.GetByIdAsync(42, 1))
                .ReturnsAsync(new Order
                {
                    OrderId = 42,
                    UserId = 1,
                    PaymentStatus = "Paid",
                    FulfillmentStatus = "Confirmed",
                    TotalAmount = 40m,
                    ShippingAddress = "123 Main St"
                });

            _orderRepositoryMock
                .Setup(r => r.GetItemsForOrderAsync(42))
                .ReturnsAsync(new List<OrderItemWithProduct>());

            // Act
            var result = await _orderService.CheckoutCartAsync(
                1,
                new CheckoutDto("123 Main St"));

            // Assert
            result.OrderId.Should().Be(42);

            // The order must use the CURRENT cart price
            _orderRepositoryMock.Verify(
                r => r.CreateOrderWithItemsAsync(
                    1,
                    "123 Main St",
                    It.Is<List<OrderItemInput>>(items =>
                        items.Count == 1 &&
                        items[0].ProductId == 10 &&
                        items[0].UnitPrice == 20m &&
                        items[0].Quantity == 2),
                    null,
                    null),
                Times.Once);

            // Cart is cleared after successful order creation
            _cartItemRepositoryMock.Verify(
                r => r.DeleteAllForCartAsync(5),
                Times.Once);
        }

        [Fact]
        public async Task CheckoutCartAsync_OrderCreationFails_CartIsNeverCleared()
        {
            // Arrange
            var cart = new Cart
            {
                CartId = 5,
                UserId = 1
            };

            var cartItems = new List<CartItemWithProduct>
            {
                new()
                {
                    CartItemId = 1,
                    CartId = 5,
                    ProductId = 10,
                    ProductName = "Widget",
                    UnitPrice = 20m,
                    Quantity = 2,
                    StockQuantity = 10
                }
            };

            _cartRepositoryMock
                .Setup(r => r.GetByUserIdAsync(1))
                .ReturnsAsync(cart);

            _cartItemRepositoryMock
                .Setup(r => r.GetAllForCartAsync(5))
                .ReturnsAsync(cartItems);

            _orderRepositoryMock
                .Setup(r => r.CreateOrderWithItemsAsync(
                    1,
                    "123 Main St",
                    It.IsAny<List<OrderItemInput>>(),
                    null,
                    null))
                .ThrowsAsync(new InvalidOperationException("Not enough stock."));

            // Act
            var act = async () =>
                await _orderService.CheckoutCartAsync(
                    1,
                    new CheckoutDto("123 Main St"));

            // Assert
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("Not enough stock.");

            // Critical:
            // order creation failed, so cart must NOT be cleared.
            _cartItemRepositoryMock.Verify(
                r => r.DeleteAllForCartAsync(It.IsAny<int>()),
                Times.Never);
        }

        [Fact]
        public async Task BuyNowAsync_ZeroQuantity_Throws()
        {
            // Act
            var act = async () =>
                await _orderService.BuyNowAsync(
                    1,
                    new BuyNowDto(
                        10,
                        0,
                        "123 Main St"));

            // Assert
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*greater than zero*");

            _productRepositoryMock.Verify(
                r => r.GetByIdAsync(It.IsAny<int>()),
                Times.Never);

            _orderRepositoryMock.Verify(
                r => r.CreateOrderWithItemsAsync(
                    It.IsAny<int>(),
                    It.IsAny<string>(),
                    It.IsAny<List<OrderItemInput>>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task BuyNowAsync_NeverTouchesCart()
        {
            // Arrange
            var product = new ProductWithCategory
            {
                ProductId = 10,
                Name = "Widget",
                Price = 15m,
                StockQuantity = 5
            };

            _productRepositoryMock
                .Setup(r => r.GetByIdAsync(10))
                .ReturnsAsync(product);

            _orderRepositoryMock
                .Setup(r => r.CreateOrderWithItemsAsync(
                    1,
                    "123 Main St",
                    It.IsAny<List<OrderItemInput>>(),
                    null,
                    null))
                .ReturnsAsync((
                    50,
                    new List<StockChangeInfo>()
                ));

            _orderRepositoryMock
                .Setup(r => r.GetByIdAsync(50, 1))
                .ReturnsAsync(new Order
                {
                    OrderId = 50,
                    UserId = 1,
                    PaymentStatus = "Paid",
                    FulfillmentStatus = "Confirmed",
                    TotalAmount = 15m,
                    ShippingAddress = "123 Main St"
                });

            _orderRepositoryMock
                .Setup(r => r.GetItemsForOrderAsync(50))
                .ReturnsAsync(new List<OrderItemWithProduct>());

            // Act
            await _orderService.BuyNowAsync(
                1,
                new BuyNowDto(
                    10,
                    1,
                    "123 Main St"));

            // Assert
            // Buy Now must NEVER read the cart.
            _cartRepositoryMock.Verify(
                r => r.GetByUserIdAsync(It.IsAny<int>()),
                Times.Never);

            // Buy Now must NEVER clear the cart.
            _cartItemRepositoryMock.Verify(
                r => r.DeleteAllForCartAsync(It.IsAny<int>()),
                Times.Never);

            // Verify current product price is used.
            _orderRepositoryMock.Verify(
                r => r.CreateOrderWithItemsAsync(
                    1,
                    "123 Main St",
                    It.Is<List<OrderItemInput>>(items =>
                        items.Count == 1 &&
                        items[0].ProductId == 10 &&
                        items[0].Quantity == 1 &&
                        items[0].UnitPrice == 15m),
                    null,
                    null),
                Times.Once);
        }

        [Fact]
        public async Task UpdateFulfillmentStatusAsync_InvalidStatus_Throws()
        {
            // Act
            var act = async () =>
                await _orderService.UpdateFulfillmentStatusAsync(
                    1,
                    "Delivering");

            // Assert
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*Invalid status*");

            _orderRepositoryMock.Verify(
                r => r.UpdateFulfillmentStatusAsync(
                    It.IsAny<int>(),
                    It.IsAny<string>()),
                Times.Never);
        }

        [Theory]
        [InlineData("Confirmed")]
        [InlineData("Shipped")]
        [InlineData("Delivered")]
        [InlineData("Cancelled")]
        public async Task UpdateFulfillmentStatusAsync_ValidStatus_Delegates(
            string newStatus)
        {
            // Arrange
            var order = new OrderWithUser
            {
                OrderId = 1,
                UserId = 1,
                FulfillmentStatus = "Confirmed",
                PaymentStatus = "Paid"
            };

            _orderRepositoryMock
                .Setup(r => r.GetByIdForAdminAsync(1))
                .ReturnsAsync(order);

            _orderRepositoryMock
                .Setup(r => r.UpdateFulfillmentStatusAsync(
                    1,
                    newStatus))
                .ReturnsAsync(true);

            var user = new User
            {
                UserId = 1,
                Email = "test@example.com"
            };

            _userRepositoryMock
                .Setup(r => r.GetByIdAsync(1))
                .ReturnsAsync(user);

            _orderRepositoryMock
                .Setup(r => r.GetByIdAsync(1, 1))
                .ReturnsAsync(new Order
                {
                    OrderId = 1,
                    UserId = 1,
                    PaymentStatus = "Paid",
                    FulfillmentStatus = newStatus,
                    TotalAmount = 40m,
                    ShippingAddress = "123 Main St"
                });

            _orderRepositoryMock
                .Setup(r => r.GetItemsForOrderAsync(1))
                .ReturnsAsync(new List<OrderItemWithProduct>());

            // Act
            var result =
                await _orderService.UpdateFulfillmentStatusAsync(
                    1,
                    newStatus);

            // Assert
            result.Should().BeTrue();

            _orderRepositoryMock.Verify(
                r => r.UpdateFulfillmentStatusAsync(
                    1,
                    newStatus),
                Times.Once);

            _emailServiceMock.Verify(
                e => e.SendOrderStatusUpdateAsync(
                    "test@example.com",
                    It.IsAny<OrderDto>(),
                    "Confirmed"),
                Times.Once);
        }
    }
}