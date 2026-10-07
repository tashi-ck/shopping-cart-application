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

    public record ChatStatusEvent(string Label) : ChatStreamEvent;

    public record ChatProductsEvent(List<ChatProductDto> Products) : ChatStreamEvent;

    public record ChatCartProposalEvent(List<ChatProductDto> Products) : ChatStreamEvent;

    // Carries the ChatLogId this exchange was saved as, so the frontend can
    // attach thumbs-up/down feedback to the correct row. Emitted right before Done.
    public record ChatLogIdEvent(int ChatLogId) : ChatStreamEvent;

    public record ChatDoneEvent : ChatStreamEvent;
}
