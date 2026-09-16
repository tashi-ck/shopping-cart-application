import { useEffect, useMemo, useState } from "react";
import { Layers, Clock, Sparkles, ShieldCheck, ShieldAlert, MessageSquareOff } from "lucide-react";
import AdminReviewRow from "../../components/admin/AdminReviewRow";
import ReviewDetailModal from "../../components/admin/ReviewDetailModal";
import { getPendingReviews, getProcessedReviews } from "../../api/reviewApi";

// Classifies a review into exactly one bucket based on its ACTUAL moderation
// outcome (status + who/what decided it), not just status alone.
//
// `moderatedBy` is null for reviews created before this column existed —
// those all went through the old manual-admin-only flow, so they're treated
// as admin-moderated here rather than showing up in neither AI bucket.
function getBucket(review) {
  if (review.moderationStatus === "Pending") return "pending";

  const by = review.moderatedBy ?? "Admin";
  if (by === "AI" && review.moderationStatus === "Approved") return "aiApproved";
  if (by === "AI" && review.moderationStatus === "Rejected") return "aiRejected";
  if (by === "Admin" && review.moderationStatus === "Approved") return "adminApproved";
  if (by === "Admin" && review.moderationStatus === "Rejected") return "adminRejected";
  return "pending"; // defensive fallback, shouldn't be reachable
}

const TABS = [
  { key: "all", label: "All", icon: Layers, activeClasses: "bg-gray-900 text-white" },
  { key: "pending", label: "Pending", icon: Clock, activeClasses: "bg-amber-600 text-white" },
  { key: "aiApproved", label: "AI approved", icon: Sparkles, activeClasses: "bg-green-600 text-white" },
  { key: "aiRejected", label: "AI rejected", icon: Sparkles, activeClasses: "bg-red-600 text-white" },
  { key: "adminApproved", label: "Admin approved", icon: ShieldCheck, activeClasses: "bg-green-700 text-white" },
  { key: "adminRejected", label: "Admin rejected", icon: ShieldAlert, activeClasses: "bg-red-700 text-white" },
];

const EMPTY_COPY = {
  all: "No reviews yet.",
  pending: "Nothing waiting for approval.",
  aiApproved: "No reviews have been auto-approved by AI yet.",
  aiRejected: "No reviews have been auto-rejected by AI yet.",
  adminApproved: "No reviews have been manually approved yet.",
  adminRejected: "No reviews have been manually rejected yet.",
};

export default function AdminReviewsPage() {
  const [pending, setPending] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReviewId, setSelectedReviewId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getPendingReviews(), getProcessedReviews()])
      .then(([pendingRes, processedRes]) => {
        setPending(pendingRes.data);
        setProcessed(processedRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Sort everything newest-first regardless of which endpoint it came from,
  // then bucket once so both the tab counts and the list itself stay in sync.
  const buckets = useMemo(() => {
    const all = [...pending, ...processed].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const result = {
      all,
      pending: [],
      aiApproved: [],
      aiRejected: [],
      adminApproved: [],
      adminRejected: [],
    };

    for (const review of all) {
      result[getBucket(review)].push(review);
    }

    return result;
  }, [pending, processed]);

  const visibleReviews = buckets[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          Moderate customer reviews, and see what AI resolved automatically versus what needed a person.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon, activeClasses }) => {
          const isActive = activeTab === key;
          const count = buckets[key].length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                isActive
                  ? `${activeClasses} border-transparent`
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              <Icon size={13} />
              {label}
              <span
                className={`text-[10px] rounded-full px-1.5 ${
                  isActive ? "bg-white/20" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : visibleReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <MessageSquareOff className="mx-auto text-gray-300 mb-2" size={24} />
          <p className="text-sm text-gray-500">{EMPTY_COPY[activeTab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((r) => (
            <AdminReviewRow key={r.reviewId} review={r} onClick={() => setSelectedReviewId(r.reviewId)} />
          ))}
        </div>
      )}

      {selectedReviewId && (
        <ReviewDetailModal
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
          onModerated={load}
        />
      )}
    </div>
  );
}