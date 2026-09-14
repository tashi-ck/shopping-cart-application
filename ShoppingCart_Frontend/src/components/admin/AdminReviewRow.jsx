import StarRating from "../StarRating";
import ModerationStatusBadge from "./ModerationStatusBadge";

export default function AdminReviewRow({ review, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-sm font-medium text-gray-900 truncate pr-2">{review.productName}</p>
        <ModerationStatusBadge status={review.moderationStatus} />
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <StarRating value={review.rating} readOnly size={12} />
        <span className="text-xs text-gray-400">{review.reviewerName}</span>
      </div>
      {review.comment && (
        <p className="text-xs text-gray-500 line-clamp-2">{review.comment}</p>
      )}
      <p className="text-[11px] text-gray-400 mt-2">
        {new Date(review.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
      </p>
    </button>
  );
}