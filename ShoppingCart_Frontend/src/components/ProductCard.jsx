import { useState } from "react";
import { ImageOff, ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, onClick }) {
  const { addItem } = useCart();
  const outOfStock = product.stockQuantity === 0;
  const lowStock = !outOfStock && product.stockQuantity < 5;

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    if (outOfStock || adding) return;

    setQuickAddError("");
    setAdding(true);
    const result = await addItem(product, 1);
    setAdding(false);

    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } else {
      setQuickAddError(result.message);
      setTimeout(() => setQuickAddError(""), 2500);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="text-left bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group cursor-pointer flex flex-col"
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

        {/* Category badge */}
        {product.categoryName && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm">
            {product.categoryName}
          </span>
        )}

        {/* Stock badge */}
        {outOfStock ? (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm">
              Out of stock
            </span>
          </div>
        ) : (
          lowStock && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              {product.stockQuantity} left
            </span>
          )
        )}

        {/* Quick-add button — appears on hover */}
        {!outOfStock && (
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={adding}
            title="Quick add to cart"
            className={`absolute bottom-2.5 right-2.5 flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-all
              opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
              ${added ? "bg-green-600" : "bg-indigo-600 hover:bg-indigo-700"} text-white disabled:opacity-70`}
          >
            {adding ? (
              <Loader2 size={15} className="animate-spin" />
            ) : added ? (
              <Check size={15} />
            ) : (
              <ShoppingCart size={15} />
            )}
          </button>
        )}

        {quickAddError && (
          <div className="absolute bottom-2.5 left-2.5 right-12 text-[10px] font-medium text-red-700 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-sm truncate">
            {quickAddError}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1.5">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-2 flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-lg font-semibold text-gray-900">${Number(product.price).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}