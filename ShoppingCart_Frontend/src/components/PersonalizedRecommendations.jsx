import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Sparkles } from "lucide-react";
import { getPersonalizedProducts } from "../api/productApi";
import { useAppUser } from "../context/AppUserContext";
import ProductCard from "./ProductCard";

export default function PersonalizedRecommendations() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth0();
  const { appUser } = useAppUser();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !appUser?.hasCompletedOnboarding) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getPersonalizedProducts(10)
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([])) // fail quiet — this is a bonus section, not critical
      .finally(() => setLoading(false));
  }, [isAuthenticated, appUser?.hasCompletedOnboarding]);

  if (!isAuthenticated || !appUser?.hasCompletedOnboarding) return null;
  if (!loading && products.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-indigo-600" /> Picked for you
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