using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.PolicyDtos;

namespace ShoppingCart.Application.Interfaces
{
    public interface IPolicyService
    {
        Task<IEnumerable<PolicyDto>> GetAllPoliciesAsync();
        Task<PolicyDto?> GetPolicyBySlugAsync(string slug);
        Task<PolicyDto> CreatePolicyAsync(CreatePolicyDto dto);
        Task<bool> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto);
        Task<bool> DeletePolicyAsync(int policyId);
    }
}
