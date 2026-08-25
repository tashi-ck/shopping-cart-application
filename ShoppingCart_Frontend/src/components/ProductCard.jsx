import { ImageOff } from "lucide-react";

export default function ProductCard({ product, onClick }) {
  const outOfStock = product.stockQuantity === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group"
    >
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ImageOff className="text-gray-300" size={32} />
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-1">{product.categoryName}</p>
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1.5">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">${product.price.toFixed(2)}</span>
          {!outOfStock && product.stockQuantity < 5 && (
            <span className="text-xs font-medium text-amber-600">{product.stockQuantity} left</span>
          )}
        </div>
      </div>
    </button>
  );
}