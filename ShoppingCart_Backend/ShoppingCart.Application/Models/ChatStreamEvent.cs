using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.Application.Models
{
    public abstract record ChatStreamEvent;

    public record ChatTextChunkEvent(string Text) : ChatStreamEvent;

    // Fired right before a tool call runs, so the UI can show what the bot is
    // doing (e.g. "Searching products...") instead of a generic spinner.
    public record ChatStatusEvent(string Label) : ChatStreamEvent;

    public record ChatProductsEvent(List<ChatProductDto> Products) : ChatStreamEvent;

    // Fired when the bot wants to propose adding specific products to the
    // cart — the frontend renders this as a confirmation card. Nothing is
    // actually added until the customer clicks it.
    public record ChatCartProposalEvent(List<ChatProductDto> Products) : ChatStreamEvent;

    public record ChatDoneEvent : ChatStreamEvent;
}
