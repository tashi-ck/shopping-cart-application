import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { MessageCircle, X, Send, Loader2, Bot, ImageOff } from "lucide-react";
import { sendChatMessage } from "../api/chatApi";

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

function ChatProductCard({ product, onOpen }) {
  const outOfStock = product.stockQuantity === 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(product.productId)}
      className="w-full flex items-center gap-3 text-left bg-white border border-gray-200 rounded-xl p-2 hover:border-indigo-300 hover:shadow-sm transition"
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
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-gray-900">${Number(product.price).toFixed(2)}</p>
        {outOfStock ? (
          <p className="text-[10px] font-medium text-red-600">Out of stock</p>
        ) : product.stockQuantity < 5 ? (
          <p className="text-[10px] font-medium text-amber-600">{product.stockQuantity} left</p>
        ) : null}
      </div>
    </button>
  );
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth0();
  const greeting = isAuthenticated ? USER_GREETING : GUEST_GREETING;
  const suggestions = isAuthenticated ? USER_SUGGESTIONS : GUEST_SUGGESTIONS;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([isAuthenticated ? USER_GREETING : GUEST_GREETING]);
  }, [isAuthenticated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const openProduct = (productId) => {
    setOpen(false);
    navigate(`/products/${productId}`);
  };

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Only role + content go back to the server; product cards are display-only.
    const priorHistory = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await sendChatMessage(trimmed, priorHistory);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply, products: res.data.products ?? [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again in a moment." },
      ]);
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2 leading-relaxed whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>

                {m.products?.length > 0 && (
                  <div className="w-[92%] mt-2 space-y-1.5">
                    {m.products.map((p) => (
                      <ChatProductCard key={p.productId} product={p} onOpen={openProduct} />
                    ))}
                  </div>
                )}
              </div>
            ))}

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

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3.5 py-2">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
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