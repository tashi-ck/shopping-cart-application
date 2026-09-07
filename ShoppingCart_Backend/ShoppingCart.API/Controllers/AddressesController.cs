using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.AddressDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AddressesController : AuthenticatedControllerBase
    {
        private readonly IAddressService _addressService;

        public AddressesController(IAddressService addressService, IUserService userService) : base(userService)
        {
            _addressService = addressService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAddresses()
        {
            var userId = await GetCurrentUserIdAsync();
            var addresses = await _addressService.GetAddressesAsync(userId);
            return Ok(addresses);
        }

        [HttpPost]
        public async Task<IActionResult> CreateAddress([FromBody] CreateAddressDto dto)
        {
            var userId = await GetCurrentUserIdAsync();
            var created = await _addressService.CreateAddressAsync(userId, dto);
            return Ok(created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAddress(int id, [FromBody] UpdateAddressDto dto)
        {
            var userId = await GetCurrentUserIdAsync();
            var updated = await _addressService.UpdateAddressAsync(userId, id, dto);
            return updated ? NoContent() : NotFound();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            var userId = await GetCurrentUserIdAsync();
            var deleted = await _addressService.DeleteAddressAsync(userId, id);
            return deleted ? NoContent() : NotFound();
        }
    }
}
