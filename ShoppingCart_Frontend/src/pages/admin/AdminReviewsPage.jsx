import { useEffect, useState } from "react";
import { MessageSquareOff, Clock, History } from "lucide-react";
import AdminReviewRow from "../../components/admin/AdminReviewRow";
import ReviewDetailModal from "../../components/admin/ReviewDetailModal";
import { getPendingReviews, getProcessedReviews } from "../../api/reviewApi";

export default function AdminReviewsPage() {
  const [pending, setPending] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">Moderate customer reviews before they go public.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Processed (Approved + Rejected) */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <History size={15} /> Processed ({processed.length})
            </h2>
            {processed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">No reviews processed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {processed.map((r) => (
                  <AdminReviewRow key={r.reviewId} review={r} onClick={() => setSelectedReviewId(r.reviewId)} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Pending */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Clock size={15} /> Pending approval ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <MessageSquareOff className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-500">Nothing waiting for approval.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <AdminReviewRow key={r.reviewId} review={r} onClick={() => setSelectedReviewId(r.reviewId)} />
                ))}
              </div>
            )}
          </div>
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