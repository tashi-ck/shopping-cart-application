import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Loader2, Bot, ImageOff, ShoppingCart, Check, RotateCcw } from "lucide-react";
import { useCart } from "../context/CartContext";

const GUEST_GREETING = {
  role: "assistant",
  content: "Hi! I'm the Go Shopping assistant. I can help you find products and answer questions about shipping, returns, and ordering. Log in and I can also check your orders.",
};

const USER_GREETING = {
  role: "assistant",
  content: "Hi! I can help you find products, answer policy questions, and check on your orders. What are you looking for?",
};

const GUEST_SUGGESTIONS = ["Show me headphones under $100", "What's your return policy?", "Recommend something for working out"];
const USER_SUGGESTIONS = ["Where is my latest order?", "Show me office gear", "What's your return policy?"];

const STORAGE_KEY = "chatWidgetHistory";

function loadStoredChat() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredChat(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can fail (private browsing, quota) — losing persistence silently is fine.
  }
}

// Markdown elements render with browser-default spacing/bullets by default,
// which looks oversized inside a small chat bubble — these overrides tighten
// them to match the bubble's existing text-sm / leading-relaxed styling.
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="bg-black/5 rounded px-1 py-0.5 text-[0.85em] font-mono">{children}</code>
  ),
  // The LLM's own instructions are plain text, not markdown, so heading syntax
  // in a reply ("# Shipping") should still read as inline emphasis, not a giant
  // heading that blows out the chat bubble's layout.
  h1: ({ children }) => <p className="font-semibold mb-2 last:mb-0">{children}</p>,
  h2: ({ children }) => <p className="font-semibold mb-2 last:mb-0">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mb-2 last:mb-0">{children}</p>,
};

// Renders assistant replies as markdown once finished; shows raw text for the
// user's own messages (never interpret their input as formatting) and for an
// assistant message still mid-stream (partial markdown syntax like an unclosed
// "**" would otherwise flicker/misrender while tokens are still arriving).
function ChatMessageContent({ message, isStreaming }) {
  if (message.role === "user" || isStreaming) {
    return <span className="whitespace-pre-line">{message.content}</span>;
  }

  return (
    <div className="prose-chat">
      <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
    </div>
  );
}

function ChatProductCard({ product, onOpen }) {
  const { addItem } = useCart();
  const outOfStock = product.stockQuantity === 0;

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    const result = await addItem(product, 1);
    setAdding(false);
    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  return (
    <div className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 hover:border-indigo-300 hover:shadow-sm transition">
      <button
        type="button"
        onClick={() => onOpen(product.productId)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageOff size={16} className="text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
          <p className="text-[11px] text-gray-400 truncate">{product.categoryName}</p>
          <p className="text-xs font-semibold text-gray-900 mt-0.5">${Number(product.price).toFixed(2)}</p>
        </div>
      </button>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {outOfStock ? (
          <span className="text-[10px] font-medium text-red-600">Out of stock</span>
        ) : (
          <>
            {product.stockQuantity < 5 && (
              <span className="text-[10px] font-medium text-amber-600">{product.stockQuantity} left</span>
            )}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding}
              title="Add to cart"
              className={`flex items-center justify-center w-7 h-7 rounded-full transition ${
                added ? "bg-green-600" : "bg-indigo-600 hover:bg-indigo-700"
              } text-white disabled:opacity-70`}
            >
              {adding ? (
                <Loader2 size={12} className="animate-spin" />
              ) : added ? (
                <Check size={12} />
              ) : (
                <ShoppingCart size={12} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const stored = loadStoredChat();
    return stored?.messages?.length ? stored.messages : [GUEST_GREETING];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const hydratedRef = useRef(false);

  const greeting = isAuthenticated ? USER_GREETING : GUEST_GREETING;
  const suggestions = isAuthenticated ? USER_SUGGESTIONS : GUEST_SUGGESTIONS;

  useEffect(() => {
    if (authLoading) return;
    const stored = loadStoredChat();
    if (stored && stored.isAuthenticated === isAuthenticated && stored.messages?.length) {
      setMessages(stored.messages);
    } else {
      setMessages([greeting]);
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveStoredChat({ isAuthenticated, messages });
  }, [messages, isAuthenticated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const openProduct = (productId) => {
    setOpen(false);
    navigate(`/products/${productId}`);
  };

  const handleClearChat = () => {
    setMessages([greeting]);
  };

  const updateLastAssistantMessage = (updater) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, ...updater(last) };
      return next;
    });
  };

  const handleSseEvent = (rawEvent) => {
    const lines = rawEvent.split("\n");
    const eventLine = lines.find((l) => l.startsWith("event: "));
    const dataLine = lines.find((l) => l.startsWith("data: "));
    if (!eventLine || !dataLine) return;

    const eventName = eventLine.slice("event: ".length);
    let data;
    try {
      data = JSON.parse(dataLine.slice("data: ".length));
    } catch {
      return;
    }

    if (eventName === "chunk") {
      updateLastAssistantMessage((last) => ({ content: (last.content || "") + data }));
    } else if (eventName === "products") {
      try {
        updateLastAssistantMessage(() => ({ products: JSON.parse(data) }));
      } catch {
        // malformed product payload — the text reply still shows fine without it
      }
    } else if (eventName === "error") {
      updateLastAssistantMessage(() => ({ content: data }));
    }
  };

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const priorHistory = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", products: [] }]);

    try {
      const headers = { "Content-Type": "application/json" };
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          headers.Authorization = `Bearer ${token}`;
        } catch {
          // Proceed without a token — backend treats this as a guest request.
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: trimmed, history: priorHistory }),
      });

      if (!response.ok || !response.body) {
        const text =
          response.status === 429
            ? (await response.text()) || "You're sending messages too quickly. Please wait a moment and try again."
            : "Sorry, something went wrong. Please try again in a moment.";
        updateLastAssistantMessage(() => ({ content: text }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          handleSseEvent(rawEvent);
        }
      }
    } catch {
      updateLastAssistantMessage(() => ({ content: "Sorry, something went wrong. Please try again in a moment." }));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const showSuggestions = messages.length === 1 && !sending;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[32rem] max-h-[80vh] bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shrink-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Bot size={16} /> Shopping Assistant
            </span>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="text-white/80 hover:text-white p-1"
                  title="Clear chat"
                  aria-label="Clear chat"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white p-1"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isStreaming = m.role === "assistant" && sending && isLast;
              const isEmptyPlaceholder = isStreaming && m.content === "";

              return (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2 leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                    }`}
                  >
                    {isEmptyPlaceholder ? (
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    ) : (
                      <ChatMessageContent message={m} isStreaming={isStreaming} />
                    )}
                  </div>

                  {m.products?.length > 0 && (
                    <div className="w-[92%] mt-2 space-y-1.5">
                      {m.products.map((p) => (
                        <ChatProductCard key={p.productId} product={p} onOpen={openProduct} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5 hover:bg-indigo-100 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 shrink-0">
              Want full details? <Link to="/orders" onClick={() => setOpen(false)} className="text-indigo-600 hover:text-indigo-700">View my orders</Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, orders, policies..."
              maxLength={1000}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition shrink-0"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-300/50 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Toggle chat assistant"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}