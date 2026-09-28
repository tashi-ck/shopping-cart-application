using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;
using static ShoppingCart.Application.DTOs.PolicyDtos;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PoliciesController : ControllerBase
    {
        private readonly IPolicyService _policyService;
        public PoliciesController(IPolicyService policyService) => _policyService = policyService;

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllPolicies()
        {
            var policies = await _policyService.GetAllPoliciesAsync();
            return Ok(policies);
        }

        [HttpGet("{slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPolicy(string slug)
        {
            var policy = await _policyService.GetPolicyBySlugAsync(slug);
            return policy is null ? NotFound() : Ok(policy);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreatePolicy([FromBody] CreatePolicyDto dto)
        {
            try
            {
                var created = await _policyService.CreatePolicyAsync(dto);
                return CreatedAtAction(nameof(GetPolicy), new { slug = created.Slug }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(int id, [FromBody] UpdatePolicyDto dto)
        {
            var updated = await _policyService.UpdatePolicyAsync(id, dto);
            return updated ? NoContent() : NotFound();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePolicy(int id)
        {
            var deleted = await _policyService.DeletePolicyAsync(id);
            return deleted ? NoContent() : NotFound();
        }
    }
}
