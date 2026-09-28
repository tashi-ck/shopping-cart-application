using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.DTOs
{
    public class PolicyDtos
    {
        public record PolicyDto(int PolicyId, string Slug, string Title, string Content, DateTime UpdatedAt);

        public record CreatePolicyDto(string Slug, string Title, string Content);

        public record UpdatePolicyDto(string Title, string Content);
    }
}
