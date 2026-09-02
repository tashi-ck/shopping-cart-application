using ShoppingCart.Application.Interfaces;
using ShoppingCart.Application.Models;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.OrderDtos;

namespace ShoppingCart.Application.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly ICartRepository _cartRepository;
        private readonly ICartItemRepository _cartItemRepository;
        private readonly IProductRepository _productRepository;
        private readonly IPaymentService _paymentService;
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;

        public OrderService(
            IOrderRepository orderRepository,
            ICartRepository cartRepository,
            ICartItemRepository cartItemRepository,
            IProductRepository productRepository,
            IPaymentService paymentService,
            IUserRepository userRepository, 
            IEmailService emailService)
        {
            _orderRepository = orderRepository;
            _cartRepository = cartRepository;
            _cartItemRepository = cartItemRepository;
            _productRepository = productRepository;
            _paymentService = paymentService;
            _userRepository = userRepository;
            _emailService = emailService;
        }

        public async Task<OrderDto> CheckoutCartAsync(int userId, CheckoutDto dto)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId)
                ?? throw new InvalidOperationException("Your cart is empty.");

            var cartItems = (await _cartItemRepository.GetAllForCartAsync(cart.CartId)).ToList();
            if (cartItems.Count == 0)
                throw new InvalidOperationException("Your cart is empty.");

            // Snapshot each product's CURRENT price right now, at checkout — this becomes
            // permanent on the order regardless of what Products.Price does afterward.
            var orderItems = cartItems
                .Select(ci => new OrderItemInput(ci.ProductId, ci.Quantity, ci.UnitPrice))
                .ToList();

            var orderId = await _orderRepository.CreateOrderWithItemsAsync(userId, dto.ShippingAddress, orderItems);

            // Only clear the cart AFTER the order transaction succeeds — if CreateOrderWithItemsAsync
            // threw (e.g. insufficient stock), execution never reaches this line, and the cart is left untouched.
            await _cartItemRepository.DeleteAllForCartAsync(cart.CartId);

            return await GetOrderAsync(userId, orderId)
                ?? throw new InvalidOperationException("Order created but could not be retrieved.");
        }

        public async Task<OrderDto> BuyNowAsync(int userId, BuyNowDto dto)
        {
            if (dto.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero.");

            var product = await _productRepository.GetByIdAsync(dto.ProductId)
                ?? throw new InvalidOperationException("Product not found.");

            var orderItems = new List<OrderItemInput>
        {
            new(product.ProductId, dto.Quantity, product.Price)
        };

            var orderId = await _orderRepository.CreateOrderWithItemsAsync(userId, dto.ShippingAddress, orderItems);

            // No cart involved at all — nothing to clear afterward.
            return await GetOrderAsync(userId, orderId)
                ?? throw new InvalidOperationException("Order created but could not be retrieved.");
        }

        public async Task<IEnumerable<OrderDto>> GetOrdersForUserAsync(int userId)
        {
            var orders = await _orderRepository.GetAllForUserAsync(userId);
            var result = new List<OrderDto>();

            foreach (var order in orders)
            {
                var items = await _orderRepository.GetItemsForOrderAsync(order.OrderId);
                result.Add(MapToDto(order, items));
            }

            return result;
        }

        public async Task<OrderDto?> GetOrderAsync(int userId, int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId, userId);
            if (order is null) return null;

            var items = await _orderRepository.GetItemsForOrderAsync(orderId);
            return MapToDto(order, items);
        }

        private static OrderDto MapToDto(Order order, IEnumerable<OrderItemWithProduct> items)
        {
            var itemDtos = items.Select(i => new OrderItemDto(
                i.OrderItemId, i.ProductId, i.ProductName, i.ImageUrl,
                i.Quantity, i.UnitPrice, i.UnitPrice * i.Quantity
            )).ToList();

            return new OrderDto(order.OrderId, order.Status, order.TotalAmount, order.ShippingAddress, order.CreatedAt, itemDtos);
        }

        private static readonly HashSet<string> ValidStatuses =
            new() { "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled" };

        public async Task<IEnumerable<AdminOrderDto>> GetAllOrdersForAdminAsync()
        {
            var orders = await _orderRepository.GetAllOrdersAsync();

            return orders.Select(o => new AdminOrderDto(
                o.OrderId, o.UserId, o.UserEmail, o.UserFirstName, o.UserLastName,
                o.Status, o.TotalAmount, o.ShippingAddress, o.CreatedAt
            ));
        }

        public async Task<bool> UpdateOrderStatusAsync(int orderId, string status)
        {
            if (!ValidStatuses.Contains(status))
                throw new InvalidOperationException(
                    $"Invalid status '{status}'. Must be one of: {string.Join(", ", ValidStatuses)}.");

            var order = await _orderRepository.GetByIdForAdminAsync(orderId)
                ?? throw new InvalidOperationException("Order not found.");

            var previousStatus = order.Status;
            if (previousStatus == status)
                return true; // no actual change — don't send a pointless "your order is still Pending" email

            var updated = await _orderRepository.UpdateStatusAsync(orderId, status);

            if (updated)
            {
                await TrySendStatusUpdateEmailAsync(order.UserId, orderId, previousStatus, status);
            }

            return updated;
        }

        private async Task TrySendStatusUpdateEmailAsync(int userId, int orderId, string previousStatus, string newStatus)
        {
            // "Pending" only ever appears as an order's STARTING status, never something it
            // transitions TO — and that moment is already covered by the order confirmation
            // email, so skip sending a redundant one here.
            if (newStatus == "Pending") return;

            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user is null) return;

                var orderDto = await GetOrderAsync(userId, orderId);
                if (orderDto is null) return;

                await _emailService.SendOrderStatusUpdateAsync(user.Email, orderDto, previousStatus);
            }
            catch (Exception ex)
            {
                // Same reasoning as the order confirmation email: a status change that already
                // succeeded in the database shouldn't fail or roll back over a flaky email send.
                Console.WriteLine($"Failed to send status update email for order {orderId}: {ex.Message}");
            }
        }

        public async Task<OrderDto> CancelOrderAsync(int userId, int orderId)
        {
            var orderBeforeCancel = await GetOrderAsync(userId, orderId)
                ?? throw new InvalidOperationException("Order not found.");
            var previousStatus = orderBeforeCancel.Status;

            await _orderRepository.CancelOrderAsync(orderId, userId);

            await TrySendStatusUpdateEmailAsync(userId, orderId, previousStatus, "Cancelled");

            return await GetOrderAsync(userId, orderId)
                ?? throw new InvalidOperationException("Order was cancelled but could not be retrieved.");
        }

        public async Task<OrderDto> CompletePaymentAsync(int userId, string sessionId)
        {
            var status = await _paymentService.GetSessionStatusAsync(sessionId);
            if (status.UserId != userId)
                throw new InvalidOperationException("This payment session does not belong to you.");
            return await ProcessCompletedPaymentAsync(sessionId, status);
        }

        public async Task<OrderDto> CompletePaymentFromWebhookAsync(string sessionId)
        {
            var status = await _paymentService.GetSessionStatusAsync(sessionId);
            return await ProcessCompletedPaymentAsync(sessionId, status);
        }

        private async Task<OrderDto> ProcessCompletedPaymentAsync(string sessionId, PaymentSessionStatus status)
        {
            var existingOrder = await _orderRepository.GetByPaymentReferenceAsync(sessionId);
            if (existingOrder is not null)
                return await GetOrderAsync(existingOrder.UserId, existingOrder.OrderId)
                    ?? throw new InvalidOperationException("Order could not be retrieved.");

            if (!status.IsPaid)
                throw new InvalidOperationException("Payment was not completed.");

            int orderId;
            bool wasNewlyCreated;

            try
            {
                if (status.Mode == "buynow")
                {
                    if (status.ProductId is null || status.Quantity is null)
                        throw new InvalidOperationException("Payment session is missing product details.");

                    var product = await _productRepository.GetByIdAsync(status.ProductId.Value)
                        ?? throw new InvalidOperationException("Product no longer exists.");

                    if (product.StockQuantity < status.Quantity.Value)
                        throw new InvalidOperationException($"Not enough stock for {product.Name}.");

                    var orderItems = new List<OrderItemInput> { new(product.ProductId, status.Quantity.Value, product.Price) };
                    (orderId, wasNewlyCreated) = await CreateOrderWithRaceProtectionAsync(status.UserId, status.ShippingAddress, orderItems, sessionId);
                }
                else
                {
                    var cart = await _cartRepository.GetByUserIdAsync(status.UserId)
                        ?? throw new InvalidOperationException("Cart not found.");

                    var cartItems = (await _cartItemRepository.GetAllForCartAsync(cart.CartId)).ToList();
                    if (cartItems.Count == 0)
                        throw new InvalidOperationException("Cart is empty — nothing to fulfill.");

                    var orderItems = cartItems
                        .Select(ci => new OrderItemInput(ci.ProductId, ci.Quantity, ci.UnitPrice))
                        .ToList();

                    (orderId, wasNewlyCreated) = await CreateOrderWithRaceProtectionAsync(status.UserId, status.ShippingAddress, orderItems, sessionId);
                    await _cartItemRepository.DeleteAllForCartAsync(cart.CartId);
                }
            }
            catch (InvalidOperationException ex)
            {
                // Payment already succeeded on Stripe's side by this point (status.IsPaid was true
                // above) — if we can't actually fulfill the order for any reason, the customer
                // shouldn't be left charged with nothing to show for it.
                await TryRefundAsync(sessionId, ex.Message);
                throw new InvalidOperationException($"{ex.Message} Your payment has been automatically refunded.");
            }

            var orderDto = await GetOrderAsync(status.UserId, orderId)
                ?? throw new InvalidOperationException("Order created but could not be retrieved.");

            if (wasNewlyCreated)
            {
                await TrySendConfirmationEmailAsync(status.UserId, orderDto);
            }

            return orderDto;
        }

        private async Task<(int OrderId, bool WasNewlyCreated)> CreateOrderWithRaceProtectionAsync(
            int userId, string shippingAddress, List<OrderItemInput> items, string sessionId)
        {
            try
            {
                var orderId = await _orderRepository.CreateOrderWithItemsAsync(userId, shippingAddress, items, sessionId);
                return (orderId, true);
            }
            catch
            {
                var existing = await _orderRepository.GetByPaymentReferenceAsync(sessionId);
                if (existing is not null)
                    return (existing.OrderId, false); // the OTHER concurrent caller created it — not a real failure

                throw; // genuine failure (e.g. stock ran out inside the transaction) — bubbles up to the catch above
            }
        }

        private async Task TrySendConfirmationEmailAsync(int userId, OrderDto order)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user is not null)
                    await _emailService.SendOrderConfirmationAsync(user.Email, order);
            }
            catch (Exception ex)
            {
                // Deliberately swallowed: the order itself already succeeded — a flaky email
                // provider shouldn't roll back a real, paid purchase or fail the webhook
                // (which would cause Stripe to retry the whole event unnecessarily).
                // In a production system this would go to a real logger/monitoring tool.
                Console.WriteLine($"Failed to send order confirmation email for order {order.OrderId}: {ex.Message}");
            }
        }

        public async Task<AdminOrderDetailDto?> GetOrderForAdminAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdForAdminAsync(orderId);
            if (order is null) return null;

            var items = await _orderRepository.GetItemsForOrderAsync(orderId);

            var itemDtos = items.Select(i => new OrderItemDto(
                i.OrderItemId, i.ProductId, i.ProductName, i.ImageUrl,
                i.Quantity, i.UnitPrice, i.UnitPrice * i.Quantity
            )).ToList();

            return new AdminOrderDetailDto(
                order.OrderId, order.UserId, order.UserEmail, order.UserFirstName, order.UserLastName,
                order.Status, order.TotalAmount, order.ShippingAddress, order.PaymentReference,
                order.CreatedAt, itemDtos
            );
        }

        private async Task TryRefundAsync(string sessionId, string reason)
        {
            try
            {
                await _paymentService.RefundAsync(sessionId);
            }
            catch (Exception ex)
            {
                // Unlike the confirmation email, a FAILED refund is genuinely serious — the
                // customer is charged with no order and no automatic way to get their money
                // back. This needs real visibility (a proper logger/alerting in production);
                // for now it's at least distinctly flagged so it's not missed in the console.
                Console.WriteLine($"CRITICAL: Refund failed for session {sessionId} (reason: {reason}): {ex.Message}");
            }
        }

        public Task<bool> DeleteOrderAsync(int orderId) =>
            _orderRepository.DeleteOrderAsync(orderId);
    }
}
