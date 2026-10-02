using Microsoft.Extensions.Caching.Memory;
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
        private const string CacheKey = "policies:all";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

        private readonly IPolicyRepository _policyRepository;
        private readonly IMemoryCache _cache;

        public PolicyService(IPolicyRepository policyRepository, IMemoryCache cache)
        {
            _policyRepository = policyRepository;
            _cache = cache;
        }

        public async Task<IEnumerable<PolicyDto>> GetAllPoliciesAsync()
        {
            // The chatbot calls this on EVERY message to build its system prompt — without
            // caching that's a DB round trip per chat turn for content that rarely changes.
            if (_cache.TryGetValue(CacheKey, out List<PolicyDto>? cached) && cached is not null)
                return cached;

            var policies = (await _policyRepository.GetAllAsync()).Select(MapToDto).ToList();
            _cache.Set(CacheKey, policies, CacheDuration);
            return policies;
        }

        public async Task<PolicyDto?> GetPolicyBySlugAsync(string slug)
        {
            // Reuses the cached full list instead of a second DB round trip — slug lookups
            // are rare enough that this is fine, and it keeps just one cache entry to invalidate.
            var all = await GetAllPoliciesAsync();
            return all.FirstOrDefault(p => p.Slug == slug);
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
            _cache.Remove(CacheKey);
            return MapToDto(created);
        }

        public async Task<bool> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto)
        {
            var updated = await _policyRepository.UpdateAsync(policyId, dto.Title.Trim(), dto.Content.Trim());
            if (updated) _cache.Remove(CacheKey);
            return updated;
        }

        public async Task<bool> DeletePolicyAsync(int policyId)
        {
            var deleted = await _policyRepository.DeleteAsync(policyId);
            if (deleted) _cache.Remove(CacheKey);
            return deleted;
        }

        private static PolicyDto MapToDto(Policy p) => new(p.PolicyId, p.Slug, p.Title, p.Content, p.UpdatedAt);
    }
}
