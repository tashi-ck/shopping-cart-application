import StarRating from "./StarRating";

export default function RatingDistribution({ distribution, reviewCount }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0;
        const percent = reviewCount === 0 ? 0 : Math.round((count / reviewCount) * 100);
        return (
          <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-8 shrink-0">{star} star</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
            </div>
            <span className="w-8 text-right shrink-0">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}