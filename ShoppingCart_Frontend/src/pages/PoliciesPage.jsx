import { useEffect, useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
import { getPolicies } from "../api/policyApi";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSlug, setOpenSlug] = useState(null);

  useEffect(() => {
    getPolicies()
      .then((res) => {
        setPolicies(res.data);
        if (res.data.length > 0) setOpenSlug(res.data[0].slug);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading policies...</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <ScrollText size={22} className="text-indigo-600" /> Policies
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything you need to know about shipping, returns, and how ordering works here.
        </p>
      </div>

      {policies.length === 0 ? (
        <p className="text-sm text-gray-500">No policies available yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {policies.map((p) => {
            const isOpen = openSlug === p.slug;
            return (
              <div key={p.policyId}>
                <button
                  type="button"
                  onClick={() => setOpenSlug(isOpen ? null : p.slug)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
                >
                  <span className="text-sm font-medium text-gray-900">{p.title}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {p.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}