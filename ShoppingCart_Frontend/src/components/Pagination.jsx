import { ChevronLeft, ChevronRight } from "lucide-react";

// Shows first, last, and current ±1, with "…" for gaps. Small page counts show everything.
function getPageItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

export default function Pagination({ page, totalPages, totalCount, pageSize, onChange }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const items = getPageItems(page, totalPages);

  const btnBase = "min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium flex items-center justify-center transition";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-10">
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-900">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-900">{totalCount}</span> products
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent`}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {items.map((item) =>
          typeof item === "string" ? (
            <span key={item} className="w-6 text-center text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`${btnBase} ${
                item === page
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent`}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}