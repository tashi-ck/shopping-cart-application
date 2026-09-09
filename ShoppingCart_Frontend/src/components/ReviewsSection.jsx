import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import StarRating from "./StarRating";
import {
  getReviews,
  getReviewSummary,
  getReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
} from "../api/reviewApi";

function timeAgo(dateString) {
  const days = Math.floor((Date.now() - new Date(dateString)) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function ReviewsSection({ productId }) {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, reviewCount: 0 });
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    const [reviewsRes, summaryRes] = await Promise.all([
      getReviews(productId),
      getReviewSummary(productId),
    ]);
    setReviews(reviewsRes.data);
    setSummary(summaryRes.data);

    if (isAuthenticated) {
      try {
        const eligRes = await getReviewEligibility(productId);
        setEligibility(eligRes.data);
      } catch {
        setEligibility(null);
      }
    } else {
      setEligibility(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [productId, isAuthenticated]);

  const ownReview = reviews.find((r) => r.isOwn);

  const startWrite = () => {
    setFormRating(5);
    setFormComment("");
    setFormError("");
    setShowForm(true);
  };

  const startEdit = () => {
    setFormRating(ownReview.rating);
    setFormComment(ownReview.comment ?? "");
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (ownReview) {
        await updateReview(ownReview.reviewId, formRating, formComment || null);
      } else {
        await createReview(productId, formRating, formComment || null);
      }
      setShowForm(false);
      await loadAll(); // re-fetch so the summary average and review list reflect the change
    } catch (err) {
      setFormError(err.response?.data ?? "Couldn't save your review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    await deleteReview(reviewId);
    setConfirmingDeleteId(null);
    await loadAll();
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading reviews...</p>;
  }

  return (
    <div className="border-t border-gray-100 pt-8 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} /> Reviews
          </h2>
          {summary.reviewCount > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={Math.round(summary.averageRating)} readOnly size={15} />
              <span className="text-sm text-gray-600">
                {summary.averageRating.toFixed(1)} ({summary.reviewCount} review{summary.reviewCount !== 1 ? "s" : ""})
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-1">No reviews yet.</p>
          )}
        </div>

        {!showForm && isAuthenticated && eligibility?.canReview && (
          <button
            type="button"
            onClick={startWrite}
            className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
          >
            Write a review
          </button>
        )}

        {!showForm && isAuthenticated && eligibility?.alreadyReviewed && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Pencil size={14} /> Edit your review
          </button>
        )}

        {!isAuthenticated && (
          <button
            type="button"
            onClick={() => loginWithRedirect({ appState: { returnTo: window.location.pathname } })}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Log in to review
          </button>
        )}
      </div>

      {isAuthenticated && eligibility && !eligibility.canReview && !eligibility.alreadyReviewed && (
        <p className="text-xs text-gray-400 mb-4">{eligibility.reason}</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
          <p className="text-sm font-medium text-gray-900">{ownReview ? "Edit your review" : "Write a review"}</p>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1">Rating</p>
            <StarRating value={formRating} onChange={setFormRating} size={22} />
          </div>

          <textarea
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            rows={3}
            placeholder="Share your thoughts about this product (optional)..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {submitting ? "Saving..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-5">
        {reviews.map((r) => (
          <div key={r.reviewId} className="pb-5 border-b border-gray-50 last:border-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{r.reviewerName}</span>
                  {r.isOwn && (
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                      Your review
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} readOnly size={13} />
                  <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                </div>
              </div>

              {r.isOwn && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={startEdit} className="text-gray-400 hover:text-indigo-600">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmingDeleteId(r.reviewId)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {r.comment && <p className="text-sm text-gray-600 mt-2">{r.comment}</p>}

            {confirmingDeleteId === r.reviewId && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-600">Delete this review?</span>
                <button
                  onClick={() => handleDelete(r.reviewId)}
                  className="text-xs font-medium bg-red-600 text-white rounded-lg px-2.5 py-1 hover:bg-red-700"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmingDeleteId(null)}
                  className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                >
                  No
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}