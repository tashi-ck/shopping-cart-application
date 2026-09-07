using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IAddressRepository
    {
        Task<IEnumerable<Address>> GetAllForUserAsync(int userId);
        Task<Address?> GetByIdAndUserAsync(int addressId, int userId);
        Task<Address> CreateAsync(Address address);
        Task<bool> UpdateAsync(Address address);
        Task<bool> DeleteAsync(int addressId, int userId);
        Task ClearDefaultForUserAsync(int userId);
    }
}
