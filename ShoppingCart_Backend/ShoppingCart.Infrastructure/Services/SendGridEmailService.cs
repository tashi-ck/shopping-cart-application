using Microsoft.Extensions.Configuration;
using SendGrid;
using SendGrid.Helpers.Mail;
using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.OrderDtos;

namespace ShoppingCart.Infrastructure.Services
{
    public class SendGridEmailService : IEmailService
    {
        private readonly string _apiKey;
        private readonly string _fromEmail;
        private readonly string _fromName;

        public SendGridEmailService(IConfiguration configuration)
        {
            _apiKey = configuration["SendGrid:ApiKey"]!;
            _fromEmail = configuration["SendGrid:FromEmail"]!;
            _fromName = configuration["SendGrid:FromName"]!;
        }

        public async Task SendOrderConfirmationAsync(string toEmail, OrderDto order)
        {
            var client = new SendGridClient(_apiKey);
            var from = new EmailAddress(_fromEmail, _fromName);
            var to = new EmailAddress(toEmail);
            var subject = $"Order Confirmation — Order #{order.OrderId}";

            var htmlContent = BuildHtmlBody(order);
            var plainTextContent = BuildPlainTextBody(order);

            var msg = MailHelper.CreateSingleEmail(from, to, subject, plainTextContent, htmlContent);
            var response = await client.SendEmailAsync(msg);

            // SendGrid returns 202 Accepted on success — anything else means the email
            // genuinely wasn't sent (bad API key, invalid address, etc.)
            if ((int)response.StatusCode >= 300)
            {
                var body = await response.Body.ReadAsStringAsync();
                throw new InvalidOperationException($"SendGrid failed ({response.StatusCode}): {body}");
            }
        }

        private static string BuildPlainTextBody(OrderDto order)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"Thank you for your order — Order #{order.OrderId}");
            sb.AppendLine();
            foreach (var item in order.Items)
                sb.AppendLine($"- {item.ProductName} x{item.Quantity} — ${item.LineTotal:F2}");
            sb.AppendLine();
            sb.AppendLine($"Total: ${order.TotalAmount:F2}");
            sb.AppendLine($"Shipping to: {order.ShippingAddress}");
            return sb.ToString();
        }

        private static string BuildHtmlBody(OrderDto order)
        {
            var itemsHtml = string.Join("", order.Items.Select(item => $"""
            <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee;">{item.ProductName}</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">{item.Quantity}</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${item.LineTotal:F2}</td>
            </tr>
            """));

            return $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                <h2 style="color:#111;">Thanks for your order!</h2>
                <p style="color:#555;">Order #{order.OrderId} has been confirmed.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <thead>
                        <tr style="text-align:left;color:#888;font-size:12px;text-transform:uppercase;">
                            <th style="padding-bottom:8px;">Item</th>
                            <th style="padding-bottom:8px;text-align:center;">Qty</th>
                            <th style="padding-bottom:8px;text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>{itemsHtml}</tbody>
                </table>
                <p style="text-align:right;font-weight:bold;font-size:16px;">
                    Total: ${order.TotalAmount:F2}
                </p>
                <p style="color:#555;">
                    <strong>Shipping to:</strong><br/>{order.ShippingAddress}
                </p>
            </div>
            """;
        }
    }
}
