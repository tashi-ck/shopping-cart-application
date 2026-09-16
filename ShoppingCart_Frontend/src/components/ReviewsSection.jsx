import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { MessageSquare, Pencil, Trash2, ShieldCheck, ThumbsUp, ThumbsDown, Clock, XCircle } from "lucide-react";
import StarRating from "./StarRating";
import RatingDistribution from "./RatingDistribution";
import {
  getReviews,
  getReviewSummary,
  getReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  voteHelpful,
  removeVote,
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

function ReviewCard({ review, onEdit, onDelete, onVote, confirmingDelete, onConfirmDelete, onCancelDelete }) {
  const handleVoteClick = async (isHelpful) => {
    if (review.userVote === isHelpful) {
      await removeVote(review.reviewId);
    } else {
      await voteHelpful(review.reviewId, isHelpful);
    }
    onVote();
  };

  const isPublic = review.moderationStatus === "Approved";

  return (
    <div className="pb-5 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{review.reviewerName}</span>
            {review.isOwn && (
              <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                Your review
              </span>
            )}
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                <ShieldCheck size={10} /> Verified Purchase
              </span>
            )}
            {review.isOwn && review.moderationStatus === "Pending" && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                <Clock size={10} /> Awaiting approval
              </span>
            )}
            {review.isOwn && review.moderationStatus === "Rejected" && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                <XCircle size={10} /> Not approved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} readOnly size={13} />
            <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
          </div>
        </div>

        {review.isOwn && (
          <div className="flex gap-2 shrink-0">
            <button onClick={onEdit} className="text-gray-400 hover:text-indigo-600">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-600">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {review.comment && <p className="text-sm text-gray-600 mt-2">{review.comment}</p>}

      {review.isOwn && review.moderationStatus === "Rejected" && review.rejectionReason && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
          Reason: {review.rejectionReason}
        </p>
      )}

      {review.isOwn && review.moderationStatus === "Pending" && (
        <p className="text-xs text-gray-400 mt-2">
          Your review is awaiting approval and isn't publicly visible yet.
        </p>
      )}

      {confirmingDelete ? (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-600">Delete this review?</span>
          <button
            onClick={onConfirmDelete}
            className="text-xs font-medium bg-red-600 text-white rounded-lg px-2.5 py-1 hover:bg-red-700"
          >
            Yes
          </button>
          <button
            onClick={onCancelDelete}
            className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
          >
            No
          </button>
        </div>
      ) : (
        !review.isOwn && isPublic && (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-gray-400">Helpful?</span>
            <button
              type="button"
              onClick={() => handleVoteClick(true)}
              className={`flex items-center gap-1 text-xs transition ${
                review.userVote === true ? "text-indigo-600 font-medium" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <ThumbsUp size={13} /> {review.helpfulCount}
            </button>
            <button
              type="button"
              onClick={() => handleVoteClick(false)}
              className={`flex items-center gap-1 text-xs transition ${
                review.userVote === false ? "text-indigo-600 font-medium" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <ThumbsDown size={13} /> {review.notHelpfulCount}
            </button>
          </div>
        )
      )}
    </div>
  );
}

// Maps the review's ACTUAL post-moderation status to the right banner copy.
// Moderation can now resolve instantly (AI approve/reject), so this can no
// longer be a single hardcoded "awaiting admin approval" message.
function SubmitStatusBanner({ status }) {
  if (status === "Approved") {
    return (
      <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        Your review is live — thanks for sharing your feedback!
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        Your review wasn't approved — see the reason below.
      </div>
    );
  }

  // Pending — covers both "AI flagged it for a human" and any moderation-service failure
  return (
    <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
      Thanks! Your review has been submitted and is awaiting approval.
    </div>
  );
}

export default function ReviewsSection({ productId }) {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, reviewCount: 0, distribution: {} });
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  // Was a plain boolean (submitSuccess) — now holds the actual resulting
  // moderationStatus ("Approved" | "Pending" | "Rejected") so the banner
  // can say something true, instead of always claiming "awaiting admin approval".
  const [submitStatus, setSubmitStatus] = useState(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  // Returns the freshly-fetched reviews so callers can read the just-submitted
  // review's real status without waiting on React state to re-render first.
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
    return reviewsRes.data;
  };

  useEffect(() => {
    loadAll();
  }, [productId, isAuthenticated]);

  const ownReview = reviews.find((r) => r.isOwn);

  const startWrite = () => {
    setFormRating(5);
    setFormComment("");
    setFormError("");
    setSubmitStatus(null);
    setShowForm(true);
  };

  const startEdit = () => {
    setFormRating(ownReview.rating);
    setFormComment(ownReview.comment ?? "");
    setFormError("");
    setSubmitStatus(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (ownReview) {
        // updateReview's endpoint returns 204 No Content, so we can't read the
        // new status off its response — reload and read it from there instead.
        await updateReview(ownReview.reviewId, formRating, formComment || null);
      } else {
        // createReview DOES return the created ReviewDto with a real status,
        // but reloading afterwards anyway keeps this path identical either way
        // and guarantees `reviews`/`summary` are in sync with what's shown.
        await createReview(productId, formRating, formComment || null);
      }
      setShowForm(false);

      const freshReviews = await loadAll();
      const mine = freshReviews.find((r) => r.isOwn);
      setSubmitStatus(mine?.moderationStatus ?? "Pending");
    } catch (err) {
      setFormError(err.response?.data ?? "Couldn't save your review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    await deleteReview(reviewId);
    setConfirmingDeleteId(null);
    setSubmitStatus(null);
    await loadAll();
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading reviews...</p>;
  }

  return (
    <div id="reviews" className="border-t border-gray-100 pt-8 mt-8">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <MessageSquare size={18} /> Reviews
      </h2>

      {summary.reviewCount > 0 ? (
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-gray-900">{summary.averageRating.toFixed(1)}</span>
              <StarRating value={Math.round(summary.averageRating)} readOnly size={16} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {summary.reviewCount} review{summary.reviewCount !== 1 ? "s" : ""}
            </p>
          </div>
          <RatingDistribution distribution={summary.distribution} reviewCount={summary.reviewCount} />
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-6">No reviews yet.</p>
      )}

      {submitStatus && !showForm && <SubmitStatusBanner status={submitStatus} />}

      <div className="flex items-center gap-3 mb-6">
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

          {ownReview && (
            <p className="text-xs text-gray-500">
              Editing will send your review through moderation again before it's public.
            </p>
          )}

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
          <ReviewCard
            key={r.reviewId}
            review={r}
            onEdit={startEdit}
            onDelete={() => setConfirmingDeleteId(r.reviewId)}
            onVote={loadAll}
            confirmingDelete={confirmingDeleteId === r.reviewId}
            onConfirmDelete={() => handleDelete(r.reviewId)}
            onCancelDelete={() => setConfirmingDeleteId(null)}
          />
        ))}
      </div>
    </div>
  );
}