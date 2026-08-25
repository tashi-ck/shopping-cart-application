import { useEffect, useState } from "react";
import { getProducts } from "../../api/productApi";
import { getCategories } from "../../api/categoryApi";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-semibold mt-1 ${accent ?? "text-gray-900"}`}>{value}</p>
    </div>
  );
}

const LOW_STOCK_THRESHOLD = 5;

export default function AdminDashboardPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading dashboard...</p>;

  const lowStock = products.filter((p) => p.stockQuantity < LOW_STOCK_THRESHOLD);
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stockQuantity, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your catalog.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total products" value={products.length} />
        <StatCard label="Categories" value={categories.length} />
        <StatCard
          label="Low stock"
          value={lowStock.length}
          accent={lowStock.length > 0 ? "text-red-600" : "text-gray-900"}
        />
        <StatCard label="Inventory value" value={`$${inventoryValue.toFixed(2)}`} />
      </div>

      {lowStock.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Low stock items (under {LOW_STOCK_THRESHOLD})</h2>
          <div className="space-y-2">
            {lowStock.map((p) => (
              <div key={p.productId} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{p.name}</span>
                <span className="text-red-600 font-medium">{p.stockQuantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}