import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { sendChatMessage } from "../api/chatApi";

const GREETING = {
  role: "assistant",
  content: "Hi! I'm the Go Shopping assistant. Ask me about shipping, returns, cancellations, or how ordering works.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      // Send the conversation so far (excluding the greeting, which isn't a real
      // exchange) as history, plus the new message.
      const history = nextMessages
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatMessage(trimmed, history.slice(0, -1));
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">
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
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2 leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3.5 py-2">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about shipping, returns..."
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