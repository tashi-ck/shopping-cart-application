using Dapper;
using Microsoft.AspNetCore.Mvc;
using ShoppingCart.Application.Interfaces;

namespace ShoppingCart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly IDbConnectionFactory _connectionFactory;
        public HealthController(IDbConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

        [HttpGet("db")]
        public async Task<IActionResult> CheckDb()
        {
            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QuerySingleAsync<int>("SELECT 1");
            return Ok(new { connected = result == 1 });
        }
    }
}
