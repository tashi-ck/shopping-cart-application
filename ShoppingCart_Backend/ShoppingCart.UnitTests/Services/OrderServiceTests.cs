using FluentAssertions;
using Moq;
using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using ShoppingCart.Application.Services;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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
        private readonly OrderService _orderService;

        public OrderServiceTests()
        {
            _orderService = new OrderService(
                _orderRepositoryMock.Object, _cartRepositoryMock.Object,
                _cartItemRepositoryMock.Object, _productRepositoryMock.Object, _paymentServiceMock.Object);
        }

        [Fact]
        public async Task CheckoutCartAsync_NoCart_Throws()
        {
            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(1)).ReturnsAsync((Cart?)null);

            var act = async () => await _orderService.CheckoutCartAsync(1, new CheckoutDto("123 Main St"));

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
        }

        [Fact]
        public async Task CheckoutCartAsync_EmptyCart_Throws()
        {
            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(1)).ReturnsAsync(new Cart { CartId = 5, UserId = 1 });
            _cartItemRepositoryMock.Setup(r => r.GetAllForCartAsync(5)).ReturnsAsync(new List<CartItemWithProduct>());

            var act = async () => await _orderService.CheckoutCartAsync(1, new CheckoutDto("123 Main St"));

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
            _orderRepositoryMock.Verify(r => r.CreateOrderWithItemsAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<List<OrderItemInput>>(), It.IsAny<string?>()), Times.Never);
        }

        [Fact]
        public async Task CheckoutCartAsync_Success_ClearsCartOnlyAfterOrderCreated()
        {
            var cart = new Cart { CartId = 5, UserId = 1 };
            var cartItems = new List<CartItemWithProduct>
        {
            new() { CartItemId = 1, CartId = 5, ProductId = 10, ProductName = "Widget", UnitPrice = 20m, Quantity = 2, StockQuantity = 10 }
        };

            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(1)).ReturnsAsync(cart);
            _cartItemRepositoryMock.Setup(r => r.GetAllForCartAsync(5)).ReturnsAsync(cartItems);
            _orderRepositoryMock
                .Setup(r => r.CreateOrderWithItemsAsync(1, "123 Main St", It.IsAny<List<OrderItemInput>>(), null))
                .ReturnsAsync(42);
            _orderRepositoryMock.Setup(r => r.GetByIdAsync(42, 1)).ReturnsAsync(new Order { OrderId = 42, UserId = 1, Status = "Pending", TotalAmount = 40m, ShippingAddress = "123 Main St" });
            _orderRepositoryMock.Setup(r => r.GetItemsForOrderAsync(42)).ReturnsAsync(new List<OrderItemWithProduct>());

            var result = await _orderService.CheckoutCartAsync(1, new CheckoutDto("123 Main St"));

            result.OrderId.Should().Be(42);

            // The snapshot passed to CreateOrderWithItemsAsync must use the CURRENT cart price (20m),
            // exactly matching the checkout-snapshotting design from earlier in the project
            _orderRepositoryMock.Verify(r => r.CreateOrderWithItemsAsync(
                1, "123 Main St",
                It.Is<List<OrderItemInput>>(items => items.Count == 1 && items[0].UnitPrice == 20m && items[0].Quantity == 2),
                null
            ), Times.Once);

            _cartItemRepositoryMock.Verify(r => r.DeleteAllForCartAsync(5), Times.Once);
        }

        [Fact]
        public async Task CheckoutCartAsync_OrderCreationFails_CartIsNeverCleared()
        {
            var cart = new Cart { CartId = 5, UserId = 1 };
            var cartItems = new List<CartItemWithProduct>
        {
            new() { CartItemId = 1, CartId = 5, ProductId = 10, ProductName = "Widget", UnitPrice = 20m, Quantity = 2, StockQuantity = 10 }
        };

            _cartRepositoryMock.Setup(r => r.GetByUserIdAsync(1)).ReturnsAsync(cart);
            _cartItemRepositoryMock.Setup(r => r.GetAllForCartAsync(5)).ReturnsAsync(cartItems);
            _orderRepositoryMock
                .Setup(r => r.CreateOrderWithItemsAsync(1, "123 Main St", It.IsAny<List<OrderItemInput>>(), null))
                .ThrowsAsync(new InvalidOperationException("Not enough stock."));

            var act = async () => await _orderService.CheckoutCartAsync(1, new CheckoutDto("123 Main St"));

            await act.Should().ThrowAsync<InvalidOperationException>();

            // Critical: if order creation throws (e.g. insufficient stock discovered inside the
            // transaction), execution never reaches the cart-clearing line — the customer's cart
            // stays exactly as it was, so they don't lose their selections over a failed checkout.
            _cartItemRepositoryMock.Verify(r => r.DeleteAllForCartAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task BuyNowAsync_ZeroQuantity_Throws()
        {
            var act = async () => await _orderService.BuyNowAsync(1, new BuyNowDto(10, 0, "123 Main St"));

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*greater than zero*");
        }

        [Fact]
        public async Task BuyNowAsync_NeverTouchesCart()
        {
            var product = new ProductWithCategory { ProductId = 10, Name = "Widget", Price = 15m, StockQuantity = 5 };
            _productRepositoryMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(product);
            _orderRepositoryMock
                .Setup(r => r.CreateOrderWithItemsAsync(1, "123 Main St", It.IsAny<List<OrderItemInput>>(), null))
                .ReturnsAsync(50);
            _orderRepositoryMock.Setup(r => r.GetByIdAsync(50, 1)).ReturnsAsync(new Order { OrderId = 50, UserId = 1, Status = "Pending", TotalAmount = 15m, ShippingAddress = "123 Main St" });
            _orderRepositoryMock.Setup(r => r.GetItemsForOrderAsync(50)).ReturnsAsync(new List<OrderItemWithProduct>());

            await _orderService.BuyNowAsync(1, new BuyNowDto(10, 1, "123 Main St"));

            // The defining property of Buy Now — proving the cart is genuinely never involved
            _cartRepositoryMock.Verify(r => r.GetByUserIdAsync(It.IsAny<int>()), Times.Never);
            _cartItemRepositoryMock.Verify(r => r.DeleteAllForCartAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task UpdateOrderStatusAsync_InvalidStatus_Throws()
        {
            var act = async () => await _orderService.UpdateOrderStatusAsync(1, "Delivering");

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Invalid status*");
            _orderRepositoryMock.Verify(r => r.UpdateStatusAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
        }

        [Theory]
        [InlineData("Pending")]
        [InlineData("Confirmed")]
        [InlineData("Shipped")]
        [InlineData("Delivered")]
        [InlineData("Cancelled")]
        public async Task UpdateOrderStatusAsync_ValidStatus_Delegates(string status)
        {
            _orderRepositoryMock.Setup(r => r.UpdateStatusAsync(1, status)).ReturnsAsync(true);

            var result = await _orderService.UpdateOrderStatusAsync(1, status);

            result.Should().BeTrue();
        }
    }
}
