using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.AddressDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IAddressService
    {
        Task<IEnumerable<AddressDto>> GetAddressesAsync(int userId);
        Task<AddressDto> CreateAddressAsync(int userId, CreateAddressDto dto);
        Task<bool> UpdateAddressAsync(int userId, int addressId, UpdateAddressDto dto);
        Task<bool> DeleteAddressAsync(int userId, int addressId);
    }
}
