import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ScrollText, Search, X, MessageCircle, PackageSearch } from "lucide-react";
import { getPolicies } from "../api/policyApi";

// Offset so a scrolled-to section clears the sticky navbar.
const SCROLL_OFFSET = 96;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Wraps matches of the search term in <mark>. Splitting with a capture group keeps
// the matched pieces at odd indexes, so no regex .test() state issues.
function Highlight({ text, term }) {
  if (!term) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-amber-100 text-gray-900 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

function openChat() {
  window.dispatchEvent(new Event("chat:open"));
}

export default function PoliciesPage() {
  const location = useLocation();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openSlugs, setOpenSlugs] = useState(new Set());
  const [activeSlug, setActiveSlug] = useState(null);

  const sectionRefs = useRef({});
  const initialHashHandled = useRef(false);

  const load = () => {
    setLoading(true);
    setError("");
    getPolicies()
      .then((res) => setPolicies(res.data))
      .catch(() => setError("Couldn't load our policies."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const term = query.trim();

  const visiblePolicies = useMemo(() => {
    if (!term) return policies;
    const q = term.toLowerCase();
    return policies.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  }, [policies, term]);

  const scrollToSlug = (slug) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const openAndScroll = (slug) => {
    setOpenSlugs((prev) => new Set(prev).add(slug));
    setActiveSlug(slug);
    // Wait a frame so the section is expanded before measuring its position.
    requestAnimationFrame(() => scrollToSlug(slug));
  };

  // Deep links (/policies#returns, used by the footer). Re-runs when the hash changes,
  // but only seeds the default "first policy open" once.
  useEffect(() => {
    if (policies.length === 0) return;
    const hash = location.hash.replace("#", "");
    const match = policies.find((p) => p.slug === hash);

    if (match) {
      openAndScroll(match.slug);
    } else if (!initialHashHandled.current) {
      setOpenSlugs(new Set([policies[0].slug]));
      setActiveSlug(policies[0].slug);
    }
    initialHashHandled.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies, location.hash]);

  // While searching, show every match expanded so the highlighted text is visible.
  const isOpen = (slug) => !!term || openSlugs.has(slug);

  const toggle = (slug) =>
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });

  const allOpen = visiblePolicies.length > 0 && visiblePolicies.every((p) => openSlugs.has(p.slug));
  const toggleAll = () =>
    setOpenSlugs(allOpen ? new Set() : new Set(visiblePolicies.map((p) => p.slug)));

  // Scroll-spy: highlight whichever section is near the top of the viewport.
  useEffect(() => {
    if (visiblePolicies.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const topMost = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topMost) setActiveSlug(topMost.target.dataset.slug);
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -60% 0px` }
    );
    visiblePolicies.forEach((p) => {
      const el = sectionRefs.current[p.slug];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visiblePolicies]);

  if (loading) {
    return (
      <div className="animate-pulse max-w-5xl">
        <div className="h-8 bg-gray-100 rounded w-40 mb-6" />
        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          <div className="hidden lg:block h-48 bg-gray-100 rounded-2xl" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-xl">
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <button onClick={load} className="text-sm font-medium text-red-700 underline">Try again</button>
      </div>
    );
  }

  const helpCard = (
    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5">
      <p className="text-sm font-semibold text-indigo-900">Still need help?</p>
      <p className="text-xs text-indigo-800/80 mt-1 mb-3">
        Our chat assistant can answer questions about shipping, returns and your orders.
      </p>
      <button
        type="button"
        onClick={openChat}
        className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
      >
        <MessageCircle size={15} /> Ask our assistant
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <ScrollText size={22} className="text-indigo-600" /> Policies
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything you need to know about shipping, returns, and how ordering works here.
        </p>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
        {/* Desktop: sticky table of contents */}
        <aside className="hidden lg:block sticky top-24 space-y-4">
          <nav aria-label="Policy contents" className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 pb-2">On this page</p>
            <ul className="space-y-0.5">
              {visiblePolicies.map((p) => (
                <li key={p.policyId}>
                  <button
                    type="button"
                    onClick={() => openAndScroll(p.slug)}
                    className={`w-full text-left text-sm rounded-lg px-2.5 py-1.5 transition ${
                      activeSlug === p.slug
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.title}
                  </button>
                </li>
              ))}
              {visiblePolicies.length === 0 && <li className="text-xs text-gray-400 px-2.5 py-1.5">No matches</li>}
            </ul>
          </nav>
          {helpCard}
        </aside>

        <div className="min-w-0">
          {/* Search + controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[220px] relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search policies (e.g. refund, cancel)..."
                className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {!term && visiblePolicies.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          {/* Mobile: compact contents chips */}
          {visiblePolicies.length > 1 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-1">
              {visiblePolicies.map((p) => (
                <button
                  key={p.policyId}
                  type="button"
                  onClick={() => openAndScroll(p.slug)}
                  className="shrink-0 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}

          {policies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <ScrollText className="mx-auto text-gray-300 mb-3" size={30} />
              <p className="text-sm text-gray-500">No policies available yet.</p>
            </div>
          ) : visiblePolicies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <PackageSearch className="mx-auto text-gray-300 mb-3" size={30} />
              <p className="text-sm font-medium text-gray-700">No policies match "{term}"</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Try a different word, or ask our assistant.</p>
              <div className="flex justify-center gap-4">
                <button type="button" onClick={() => setQuery("")} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  Clear search
                </button>
                <button type="button" onClick={openChat} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  Ask the assistant
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {term && (
                <p className="text-xs text-gray-400">
                  {visiblePolicies.length} {visiblePolicies.length === 1 ? "policy matches" : "policies match"} "{term}"
                </p>
              )}
              {visiblePolicies.map((p) => {
                const open = isOpen(p.slug);
                return (
                  <section
                    key={p.policyId}
                    id={p.slug}
                    data-slug={p.slug}
                    ref={(el) => (sectionRefs.current[p.slug] = el)}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => !term && toggle(p.slug)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        <Highlight text={p.title} term={term} />
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-5">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          <Highlight text={p.content} term={term} />
                        </p>
                        <p className="text-xs text-gray-400 mt-3">
                          Last updated{" "}
                          {new Date(p.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* Mobile: help card at the bottom (desktop shows it in the sidebar) */}
          <div className="lg:hidden mt-6">{helpCard}</div>
        </div>
      </div>
    </div>
  );
}