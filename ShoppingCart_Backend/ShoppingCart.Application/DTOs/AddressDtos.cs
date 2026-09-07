using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class AddressDtos
    {
        public record AddressDto(int AddressId, string Label, string FullAddress, bool IsDefault);

        public record CreateAddressDto(string Label, string FullAddress, bool IsDefault);

        public record UpdateAddressDto(string Label, string FullAddress, bool IsDefault);
    }
}
