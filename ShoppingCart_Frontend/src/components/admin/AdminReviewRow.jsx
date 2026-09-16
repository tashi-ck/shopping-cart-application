import StarRating from "../StarRating";
import ModerationStatusBadge from "./ModerationStatusBadge";
import AiModerationBadge from "./AiModerationBadge";

export default function AdminReviewRow({ review, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <p className="text-sm font-medium text-gray-900 truncate pr-2">{review.productName}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <AiModerationBadge label={review.aiModerationLabel} confidence={review.aiConfidenceScore} />
          <ModerationStatusBadge status={review.moderationStatus} />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <StarRating value={review.rating} readOnly size={12} />
        <span className="text-xs text-gray-400">{review.reviewerName}</span>
      </div>
      {review.comment && (
        <p className="text-xs text-gray-500 line-clamp-2">{review.comment}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-gray-400">
          {new Date(review.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </p>
        {review.moderatedBy === "AI" && (
          <p className="text-[11px] text-gray-400">Auto-moderated</p>
        )}
      </div>
    </button>
  );
}