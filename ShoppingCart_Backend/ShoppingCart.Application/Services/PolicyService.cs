using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.PolicyDtos;

namespace ShoppingCart.Application.Services
{
    public class PolicyService : IPolicyService
    {
        private readonly IPolicyRepository _policyRepository;
        public PolicyService(IPolicyRepository policyRepository) => _policyRepository = policyRepository;

        public async Task<IEnumerable<PolicyDto>> GetAllPoliciesAsync()
        {
            var policies = await _policyRepository.GetAllAsync();
            return policies.Select(MapToDto);
        }

        public async Task<PolicyDto?> GetPolicyBySlugAsync(string slug)
        {
            var policy = await _policyRepository.GetBySlugAsync(slug);
            return policy is null ? null : MapToDto(policy);
        }

        public async Task<PolicyDto> CreatePolicyAsync(CreatePolicyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Slug) || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Content))
                throw new InvalidOperationException("Slug, title, and content are all required.");

            var policy = new Policy
            {
                Slug = dto.Slug.Trim().ToLowerInvariant().Replace(" ", "-"),
                Title = dto.Title.Trim(),
                Content = dto.Content.Trim()
            };

            var created = await _policyRepository.CreateAsync(policy);
            return MapToDto(created);
        }

        public Task<bool> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto) =>
            _policyRepository.UpdateAsync(policyId, dto.Title.Trim(), dto.Content.Trim());

        public Task<bool> DeletePolicyAsync(int policyId) =>
            _policyRepository.DeleteAsync(policyId);

        private static PolicyDto MapToDto(Policy p) => new(p.PolicyId, p.Slug, p.Title, p.Content, p.UpdatedAt);
    }
}
