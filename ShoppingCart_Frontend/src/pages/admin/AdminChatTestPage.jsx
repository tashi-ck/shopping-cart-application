import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FlaskConical, Send, Loader2, RotateCcw, Bot, ImageOff } from "lucide-react";
import { getPolicies } from "../../api/policyApi";
import { getCategories } from "../../api/categoryApi";
import { testChatMessage } from "../../api/chatApi";

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  code: ({ children }) => <code className="bg-black/5 rounded px-1 py-0.5 text-[0.85em] font-mono">{children}</code>,
};

function TestProductRow({ product }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-2 py-1.5">
      <div className="w-8 h-8 rounded bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <ImageOff size={12} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-800 truncate">{product.name}</p>
        <p className="text-[11px] text-gray-400">{product.categoryName} · ${Number(product.price).toFixed(2)}</p>
      </div>
      {product.stockQuantity === 0 ? (
        <span className="text-[10px] font-medium text-red-600 shrink-0">Out of stock</span>
      ) : (
        <span className="text-[10px] text-gray-400 shrink-0">{product.stockQuantity} in stock</span>
      )}
    </div>
  );
}

export default function AdminChatTestPage() {
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    Promise.all([getPolicies(), getCategories()]).then(([policiesRes, categoriesRes]) => {
      setPolicies(policiesRes.data);
      setCategories(categoriesRes.data);
      // Default: everything in scope, mirroring production behavior exactly
      // until the admin deliberately narrows something down.
      setSelectedPolicyIds(new Set(policiesRes.data.map((p) => p.policyId)));
      setSelectedCategoryIds(new Set()); // empty = unrestricted for categories
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const togglePolicy = (id) => {
    setSelectedPolicyIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetConversation = () => setMessages([]);

  const send = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const priorHistory = messages.map((m) => ({ role: m.role, content: m.content }));
    const policyIdsParam = selectedPolicyIds.size === policies.length ? null : [...selectedPolicyIds];
    const categoryIdsParam = selectedCategoryIds.size === 0 ? null : [...selectedCategoryIds];

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await testChatMessage(trimmed, priorHistory, policyIdsParam, categoryIdsParam);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply,
          products: res.data.products ?? [],
          cartProposal: res.data.cartProposal ?? [],
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Request failed — check the backend logs." }]);
    } finally {
      setSending(false);
    }
  };

  const allPoliciesSelected = selectedPolicyIds.size === policies.length;
  const anyCategorySelected = selectedCategoryIds.size > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <FlaskConical size={22} className="text-indigo-600" /> Test the Bot
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Chat against a restricted set of policies and/or product categories to QA a change
          before it reaches real customers. Nothing here is logged or affects any real cart/order.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Scope controls */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Policies in scope</h2>
              <button
                type="button"
                onClick={() =>
                  setSelectedPolicyIds(
                    allPoliciesSelected ? new Set() : new Set(policies.map((p) => p.policyId))
                  )
                }
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                {allPoliciesSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {policies.map((p) => (
                <label key={p.policyId} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPolicyIds.has(p.policyId)}
                    onChange={() => togglePolicy(p.policyId)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {p.title}
                </label>
              ))}
            </div>
            {selectedPolicyIds.size === 0 && (
              <p className="text-[11px] text-amber-600 mt-1.5">No policies selected — the bot will say none are configured.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Product categories</h2>
              {anyCategorySelected && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds(new Set())}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Reset (all)
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              Leave all unchecked for the full catalog. Check specific ones to restrict search/recommendations to only those.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {categories.map((c) => (
                <label key={c.categoryId} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.has(c.categoryId)}
                    onChange={() => toggleCategory(c.categoryId)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={resetConversation}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition"
          >
            <RotateCcw size={14} /> Reset conversation
          </button>
        </div>

        {/* Chat panel */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[32rem]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 rounded-t-2xl">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-2">
                <Bot size={28} />
                <p className="text-sm">Send a message to start testing with the scope on the left.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2 leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown components={markdownComponents}>{m.content}</ReactMarkdown>
                  ) : (
                    <span className="whitespace-pre-line">{m.content}</span>
                  )}
                </div>

                {m.cartProposal?.length > 0 && (
                  <div className="w-[92%] mt-2 bg-indigo-50/60 border border-indigo-100 rounded-xl p-2.5 space-y-1.5">
                    <p className="text-[11px] font-medium text-indigo-900">
                      Would propose adding {m.cartProposal.length} item(s):
                    </p>
                    {m.cartProposal.map((p) => <TestProductRow key={p.productId} product={p} />)}
                  </div>
                )}

                {m.products?.length > 0 && (
                  <div className="w-[92%] mt-2 space-y-1.5">
                    {m.products.map((p) => <TestProductRow key={p.productId} product={p} />)}
                  </div>
                )}
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

          <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-gray-100 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something to test..."
              maxLength={1000}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition shrink-0"
              aria-label="Send test message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}