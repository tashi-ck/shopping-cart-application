import { Sparkles } from "lucide-react";

// Mirrors the existing statusStyles.js pattern (paymentStatusStyles, fulfillmentStatusStyles)
// but keyed by AI moderation label rather than order/payment status.
const aiLabelStyles = {
  clean: "bg-green-50 text-green-700",
  advertising: "bg-red-50 text-red-700",
  spam: "bg-red-50 text-red-700",
  abusive: "bg-red-50 text-red-700",
  hate_speech: "bg-red-50 text-red-700",
  suspicious: "bg-amber-50 text-amber-700",
};

export default function AiModerationBadge({ label, confidence, decidedBy }) {
  if (!label) return null;

  const style = aiLabelStyles[label] ?? "bg-gray-100 text-gray-600";
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style}`}
      title={decidedBy === "ai" ? "Classified by the AI model" : "Caught by a fast keyword/pattern check"}
    >
      <Sparkles size={9} />
      {label}
      {confidencePct !== null && ` (${confidencePct}%)`}
    </span>
  );
}