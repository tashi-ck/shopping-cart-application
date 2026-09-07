using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.AddressDtos;

namespace ShoppingCart.Application.Services
{
    public class AddressService : IAddressService
    {
        private readonly IAddressRepository _addressRepository;
        public AddressService(IAddressRepository addressRepository) => _addressRepository = addressRepository;

        public async Task<IEnumerable<AddressDto>> GetAddressesAsync(int userId)
        {
            var addresses = await _addressRepository.GetAllForUserAsync(userId);
            return addresses.Select(MapToDto);
        }

        public async Task<AddressDto> CreateAddressAsync(int userId, CreateAddressDto dto)
        {
            // Only one default allowed per user — clear any existing default BEFORE
            // inserting the new one, so there's never a moment with two defaults.
            if (dto.IsDefault)
            {
                await _addressRepository.ClearDefaultForUserAsync(userId);
            }

            var address = new Address
            {
                UserId = userId,
                Label = dto.Label,
                FullAddress = dto.FullAddress,
                IsDefault = dto.IsDefault
            };

            var created = await _addressRepository.CreateAsync(address);
            return MapToDto(created);
        }

        public async Task<bool> UpdateAddressAsync(int userId, int addressId, UpdateAddressDto dto)
        {
            var existing = await _addressRepository.GetByIdAndUserAsync(addressId, userId);
            if (existing is null) return false;

            if (dto.IsDefault && !existing.IsDefault)
            {
                await _addressRepository.ClearDefaultForUserAsync(userId);
            }

            var address = new Address
            {
                AddressId = addressId,
                UserId = userId,
                Label = dto.Label,
                FullAddress = dto.FullAddress,
                IsDefault = dto.IsDefault
            };

            return await _addressRepository.UpdateAsync(address);
        }

        public Task<bool> DeleteAddressAsync(int userId, int addressId) =>
            _addressRepository.DeleteAsync(addressId, userId);

        private static AddressDto MapToDto(Address a) => new(a.AddressId, a.Label, a.FullAddress, a.IsDefault);
    }
}
