using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UploadsController : ControllerBase
    {
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024;

        private readonly IImageStorageService _imageStorageService;
        public UploadsController(IImageStorageService imageStorageService) => _imageStorageService = imageStorageService;

        [HttpPost("image")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file is null || file.Length == 0)
                return BadRequest("No file provided.");

            if (file.Length > MaxFileSizeBytes)
                return BadRequest("File too large. Maximum size is 5MB.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                return BadRequest("Unsupported file type. Allowed: jpg, jpeg, png, webp.");

            var fileName = $"{Guid.NewGuid()}{extension}";

            using var stream = file.OpenReadStream();
            var imageUrl = await _imageStorageService.UploadImageAsync(stream, fileName, file.ContentType);

            return Ok(new { imageUrl });
        }
    }
}
