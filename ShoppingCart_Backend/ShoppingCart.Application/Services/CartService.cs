using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.CartDtos;

namespace ShoppingCart.Application.Services
{
    public class CartService : ICartService
    {
        private readonly ICartRepository _cartRepository;
        private readonly ICartItemRepository _cartItemRepository;
        private readonly IProductRepository _productRepository;

        public CartService(ICartRepository cartRepository, ICartItemRepository cartItemRepository, IProductRepository productRepository)
        {
            _cartRepository = cartRepository;
            _cartItemRepository = cartItemRepository;
            _productRepository = productRepository;
        }

        // Every write operation needs a Cart row to attach to — this get-or-create
        // is the "one cart per user, reused forever" pattern from the ER diagram.
        private async Task<Cart> GetOrCreateCartAsync(int userId)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            return cart ?? await _cartRepository.CreateAsync(userId);
        }

        public async Task<CartDto> GetCartAsync(int userId)
        {
            var cart = await GetOrCreateCartAsync(userId);
            return await BuildCartDtoAsync(cart.CartId);
        }

        public async Task<CartDto> AddItemAsync(int userId, AddCartItemDto dto)
        {
            if (dto.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero.");

            var product = await _productRepository.GetByIdAsync(dto.ProductId)
                ?? throw new InvalidOperationException("Product not found.");

            var cart = await GetOrCreateCartAsync(userId);

            var existing = await _cartItemRepository.GetByCartAndProductAsync(cart.CartId, dto.ProductId);

            var requestedTotalQuantity = (existing?.Quantity ?? 0) + dto.Quantity;
            if (requestedTotalQuantity > product.StockQuantity)
                throw new InvalidOperationException($"Only {product.StockQuantity} of {product.Name} available.");

            if (existing is not null)
            {
                // Product already in cart — merge quantities rather than creating a duplicate row
                await _cartItemRepository.UpdateQuantityAsync(existing.CartItemId, cart.CartId, requestedTotalQuantity);
            }
            else
            {
                await _cartItemRepository.CreateAsync(new CartItem
                {
                    CartId = cart.CartId,
                    ProductId = dto.ProductId,
                    Quantity = dto.Quantity
                });
            }

            return await BuildCartDtoAsync(cart.CartId);
        }

        public async Task<bool> UpdateItemQuantityAsync(int userId, int cartItemId, int quantity)
        {
            if (quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero. Use remove instead of setting to zero.");

            var cart = await GetOrCreateCartAsync(userId);

            var item = await _cartItemRepository.GetByIdAndCartAsync(cartItemId, cart.CartId)
                ?? throw new InvalidOperationException("Cart item not found.");

            var product = await _productRepository.GetByIdAsync(item.ProductId)
                ?? throw new InvalidOperationException("Product no longer exists.");

            if (quantity > product.StockQuantity)
                throw new InvalidOperationException($"Only {product.StockQuantity} of {product.Name} available.");

            return await _cartItemRepository.UpdateQuantityAsync(cartItemId, cart.CartId, quantity);
        }

        public async Task<bool> RemoveItemAsync(int userId, int cartItemId)
        {
            var cart = await GetOrCreateCartAsync(userId);
            return await _cartItemRepository.DeleteAsync(cartItemId, cart.CartId);
        }

        private async Task<CartDto> BuildCartDtoAsync(int cartId)
        {
            var items = await _cartItemRepository.GetAllForCartAsync(cartId);

            var itemDtos = items.Select(i => new CartItemDto(
                i.CartItemId, i.ProductId, i.ProductName, i.ImageUrl,
                i.UnitPrice, i.Quantity, i.UnitPrice * i.Quantity, i.StockQuantity
            )).ToList();

            var total = itemDtos.Sum(i => i.LineTotal);

            return new CartDto(cartId, itemDtos, total);
        }
    }
}
