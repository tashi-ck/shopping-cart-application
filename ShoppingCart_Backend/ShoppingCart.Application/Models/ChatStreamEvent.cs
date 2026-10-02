using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.ChatDtos;

namespace ShoppingCart.Application.Models
{
    // The three kinds of thing the streaming chat service can emit, in order:
    // zero or more text chunks, then an optional products event, then exactly one Done.
    public abstract record ChatStreamEvent;

    public record ChatTextChunkEvent(string Text) : ChatStreamEvent;

    public record ChatProductsEvent(List<ChatProductDto> Products) : ChatStreamEvent;

    public record ChatDoneEvent : ChatStreamEvent;
}
