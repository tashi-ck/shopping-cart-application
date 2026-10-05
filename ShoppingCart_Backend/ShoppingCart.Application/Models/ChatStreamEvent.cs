using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.Application.Models
{
    // The kinds of thing the streaming chat service can emit, in order:
    // zero or more status/text events interleaved, then an optional products
    // event, then exactly one Done.
    public abstract record ChatStreamEvent;

    public record ChatTextChunkEvent(string Text) : ChatStreamEvent;

    // Fired right before a tool call runs, so the UI can show what the bot is
    // doing (e.g. "Searching products...") instead of a generic spinner.
    public record ChatStatusEvent(string Label) : ChatStreamEvent;

    public record ChatProductsEvent(List<ChatProductDto> Products) : ChatStreamEvent;

    public record ChatDoneEvent : ChatStreamEvent;
}
