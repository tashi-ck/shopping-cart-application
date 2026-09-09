import { Star } from "lucide-react";

export default function StarRating({ value, onChange, size = 16, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition"}
        >
          <Star
            size={size}
            className={star <= value ? "fill-amber-400 text-amber-400" : "fill-transparent text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}