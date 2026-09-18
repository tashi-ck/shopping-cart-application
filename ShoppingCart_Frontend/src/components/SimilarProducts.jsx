import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { getSimilarProducts } from "../api/recommendationApi";
import ProductCard from "./ProductCard";

export default function SimilarProducts({ productId, limit = 10 }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getSimilarProducts(productId, limit)
      .then((res) => {
        if (!cancelled) setProducts(res.data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]); // fail quiet — recommendations are a bonus, not critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, limit]);

  // Nothing to show and nothing loading — don't render an empty section at all
  if (!loading && products.length === 0) return null;

  return (
    <div className="border-t border-gray-100 pt-8 mt-8">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Sparkles size={18} /> You might also like
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-5 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {products.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              onClick={() => navigate(`/products/${product.productId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}