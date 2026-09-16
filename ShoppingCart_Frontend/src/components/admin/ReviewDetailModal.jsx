import { useEffect, useState } from "react";
import { X, User, Mail, Package, ThumbsUp, ThumbsDown, Check, XCircle, Sparkles } from "lucide-react";
import StarRating from "../StarRating";
import ModerationStatusBadge from "./ModerationStatusBadge";
import { getReviewDetailForAdmin, moderateReview } from "../../api/reviewApi";

const aiPanelStyles = {
  clean: "bg-green-50 border-green-100 text-green-800",
  advertising: "bg-red-50 border-red-100 text-red-800",
  spam: "bg-red-50 border-red-100 text-red-800",
  abusive: "bg-red-50 border-red-100 text-red-800",
  hate_speech: "bg-red-50 border-red-100 text-red-800",
  suspicious: "bg-amber-50 border-amber-100 text-amber-800",
};

function AiModerationPanel({ detail }) {
  if (!detail.aiModerationLabel) return null; // pre-dates this feature, or moderation never ran

  const panelStyle = aiPanelStyles[detail.aiModerationLabel] ?? "bg-gray-50 border-gray-100 text-gray-700";
  const confidencePct = detail.aiConfidenceScore != null ? Math.round(detail.aiConfidenceScore * 100) : null;

  return (
    <div className={`rounded-lg border p-3 ${panelStyle}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles size={12} /> AI moderation
        </span>
        {confidencePct !== null && (
          <span className="text-[11px] font-medium opacity-75">{confidencePct}% confidence</span>
        )}
      </div>
      <p className="text-xs">
        Classified as <span className="font-semibold">{detail.aiModerationLabel}</span>
        {detail.moderatedBy === "Admin" && " — an admin has since overridden this"}
      </p>
      {detail.aiReasoning && (
        <p className="text-xs mt-1 opacity-90">{detail.aiReasoning}</p>
      )}
    </div>
  );
}

export default function ReviewDetailModal({ reviewId, onClose, onModerated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setLoading(true);
    getReviewDetailForAdmin(reviewId)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [reviewId]);

  const handleApprove = async () => {
    setProcessing(true);
    await moderateReview(reviewId, true, null);
    setProcessing(false);
    onModerated();
    onClose();
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) return;
    setProcessing(true);
    await moderateReview(reviewId, false, rejectionReason);
    setProcessing(false);
    onModerated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-gray-900">Review details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        {loading || !detail ? (
          <p className="text-sm text-gray-500 p-6">Loading...</p>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <ModerationStatusBadge status={detail.moderationStatus} />
              <span className="text-xs text-gray-400">
                Submitted {new Date(detail.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            <AiModerationPanel detail={detail} />

            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                <Package size={12} /> Product
              </p>
              <p className="text-sm font-medium text-gray-900">{detail.productName}</p>
              <p className="text-xs text-gray-400 mt-0.5">Order #{detail.orderId}</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                <User size={12} /> Reviewer
              </p>
              <p className="text-sm text-gray-900">{detail.reviewerName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Mail size={11} /> {detail.reviewerEmail}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">Rating</p>
              <StarRating value={detail.rating} readOnly size={16} />
            </div>

            {detail.comment && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Comment</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detail.comment}</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <ThumbsUp size={13} /> {detail.helpfulCount} helpful
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <ThumbsDown size={13} /> {detail.notHelpfulCount} not helpful
              </span>
            </div>

            {detail.moderationStatus === "Rejected" && detail.rejectionReason && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Rejection reason</p>
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                  {detail.rejectionReason}
                </p>
              </div>
            )}

            {detail.moderationStatus === "Pending" && (
              <div className="pt-2 border-t border-gray-100">
                {rejecting ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      placeholder="Reason for rejection (shown to the customer)..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRejectSubmit}
                        disabled={processing || !rejectionReason.trim()}
                        className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm rejection
                      </button>
                      <button
                        onClick={() => {
                          setRejecting(false);
                          setRejectionReason("");
                        }}
                        className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex items-center gap-1.5 text-xs font-medium bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      onClick={() => setRejecting(true)}
                      disabled={processing}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}