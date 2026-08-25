using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.ProductDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        public ProductsController(IProductService productService) => _productService = productService;

        [HttpGet]
        public async Task<IActionResult> GetProducts(
            [FromQuery] int? categoryId, [FromQuery] string? search, [FromQuery] string? sortBy,
            [FromQuery] bool includeInactive = false)
        {
            // Even though this endpoint has no [Authorize], the JWT middleware still populates
            // User if a valid token was sent — so we can check the role claim here without
            // requiring auth for everyone else browsing anonymously.
            var isAdmin = User.IsInRole("Admin");
            var effectiveIncludeInactive = includeInactive && isAdmin;

            var products = await _productService.GetAllProductsAsync(categoryId, search, sortBy, effectiveIncludeInactive);
            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _productService.GetProductAsync(id);
            return product is null ? NotFound() : Ok(product);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto)
        {
            var created = await _productService.CreateProductAsync(dto);
            return CreatedAtAction(nameof(GetProduct), new { id = created.ProductId }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductDto dto)
        {
            var updated = await _productService.UpdateProductAsync(id, dto);
            return updated ? NoContent() : NotFound();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var deleted = await _productService.DeleteProductAsync(id);
            return deleted ? NoContent() : NotFound();
        }

        [HttpPatch("{id}/active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetProductActive(int id, [FromBody] SetProductActiveDto dto)
        {
            var updated = await _productService.SetProductActiveAsync(id, dto.IsActive);
            return updated ? NoContent() : NotFound();
        }
    }
}
