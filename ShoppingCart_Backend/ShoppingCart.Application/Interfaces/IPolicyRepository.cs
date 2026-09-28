using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IPolicyRepository
    {
        Task<IEnumerable<Policy>> GetAllAsync();
        Task<Policy?> GetBySlugAsync(string slug);
        Task<Policy?> GetByIdAsync(int policyId);
        Task<Policy> CreateAsync(Policy policy);
        Task<bool> UpdateAsync(int policyId, string title, string content);
        Task<bool> DeleteAsync(int policyId);
    }
}
