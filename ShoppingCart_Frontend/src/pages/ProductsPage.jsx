import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, SlidersHorizontal, LayoutGrid, List, PackageSearch,
  ChevronDown, ShoppingCart, ImageOff, Check, Loader2, Filter,
} from "lucide-react";
import { getProducts } from "../api/productApi";
import { getCategories } from "../api/categoryApi";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";

const SORT_OPTIONS = [
  { value: "", label: "Name (A–Z)" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest first" },
];

// NOTE: this offset assumes the sticky Navbar is ~64px tall (h-16 equivalent).
// If Navbar's height changes, update this value so the toolbar sits flush beneath it.
const TOOLBAR_STICKY_OFFSET = "top-16";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  const categoryId = searchParams.get("categoryId") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "";
  const urlSearch = searchParams.get("search") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const inStockOnly = searchParams.get("inStock") === "1";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    updateParams({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function updateParams(patch) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      return next;
    });
  }

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    getProducts({ categoryId: categoryId || undefined, search: urlSearch || undefined, sortBy: sortBy || undefined })
      .then((res) => setProducts(res.data))
      .catch(() => setError("Couldn't load products. Please refresh."))
      .finally(() => setLoading(false));
  }, [categoryId, urlSearch, sortBy]);

  const selectedCategory = categories.find((c) => String(c.categoryId) === categoryId);

  const visibleProducts = useMemo(() => {
    const min = minPrice !== "" ? Number(minPrice) : null;
    const max = maxPrice !== "" ? Number(maxPrice) : null;

    return products.filter((p) => {
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (inStockOnly && p.stockQuantity <= 0) return false;
      return true;
    });
  }, [products, minPrice, maxPrice, inStockOnly]);

  const hasActiveFilters = categoryId || urlSearch || sortBy || minPrice || maxPrice || inStockOnly;
  const activeFilterCount = [categoryId, minPrice, maxPrice, inStockOnly].filter(Boolean).length;

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  const removeFilter = (key) => updateParams({ [key]: null });

  return (
    // Negative margins cancel out AppLayout's "px-6 sm:px-8" so this page runs
    // edge-to-edge instead of leaving a gap on either side.
    <div className="-mx-6 sm:-mx-8">
      {/* Breadcrumb-style header — replaces the old "Products / N available" combo.
          The live count now lives in the sticky toolbar below, where it's actually useful. */}
      <div className="px-6 sm:px-8 pb-4">
        <p className="text-xs text-gray-400 mb-1">Home / Products</p>
      </div>

      <div className="flex gap-6 items-start px-6 sm:px-8">
        {/* ---------------- Left sidebar (desktop) ---------------- */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-20 self-start">
          <FilterSidebar
            categories={categories}
            categoryId={categoryId}
            minPrice={minPrice}
            maxPrice={maxPrice}
            inStockOnly={inStockOnly}
            hasActiveFilters={hasActiveFilters}
            onSelectCategory={(id) => updateParams({ categoryId: id || null })}
            onChangeMinPrice={(v) => updateParams({ minPrice: v || null })}
            onChangeMaxPrice={(v) => updateParams({ maxPrice: v || null })}
            onToggleInStock={(v) => updateParams({ inStock: v ? "1" : null })}
            onClearAll={clearFilters}
          />
        </aside>

        {/* ---------------- Mobile sidebar drawer ---------------- */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-white shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-700 p-1">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <FilterSidebar
                  categories={categories}
                  categoryId={categoryId}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  inStockOnly={inStockOnly}
                  hasActiveFilters={hasActiveFilters}
                  onSelectCategory={(id) => updateParams({ categoryId: id || null })}
                  onChangeMinPrice={(v) => updateParams({ minPrice: v || null })}
                  onChangeMaxPrice={(v) => updateParams({ maxPrice: v || null })}
                  onToggleInStock={(v) => updateParams({ inStock: v ? "1" : null })}
                  onClearAll={clearFilters}
                />
              </div>
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-full bg-indigo-600 text-white text-sm font-medium rounded-lg py-2.5 hover:bg-indigo-700 transition"
                >
                  Show {visibleProducts.length} results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Main content ---------------- */}
        <div className="flex-1 min-w-0">
          {/* Sticky search + toolbar — stays visible while scrolling the grid below it */}
          <div className={`sticky ${TOOLBAR_STICKY_OFFSET} z-20 -mx-6 sm:mx-0 px-6 sm:px-0 pb-4 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/85`}>
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-sm">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-full border border-gray-200 bg-gray-50 focus:bg-white pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Mobile: open filter drawer */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className={`lg:hidden flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2.5 border transition ${
                    activeFilterCount > 0
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Filter size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => updateParams({ sortBy: e.target.value || null })}
                    className="appearance-none rounded-lg border border-gray-300 pl-3 pr-8 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                <div className="hidden sm:flex items-center rounded-lg border border-gray-300 overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                    className={`p-2.5 transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-50"}`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    title="List view"
                    className={`p-2.5 transition border-l border-gray-300 ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-50"}`}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>

              {/* Result count + active filter chips */}
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-gray-100">
                {!loading && !error && (
                  <span className="text-xs font-medium text-gray-500 mr-1">
                    {visibleProducts.length} {visibleProducts.length === 1 ? "result" : "results"}
                  </span>
                )}
                {urlSearch && (
                  <FilterChip label={`"${urlSearch}"`} onRemove={() => { setSearchInput(""); removeFilter("search"); }} />
                )}
                {selectedCategory && (
                  <FilterChip label={selectedCategory.name} onRemove={() => removeFilter("categoryId")} />
                )}
                {sortBy && (
                  <FilterChip
                    label={SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                    onRemove={() => removeFilter("sortBy")}
                  />
                )}
                {minPrice && <FilterChip label={`Min $${minPrice}`} onRemove={() => removeFilter("minPrice")} />}
                {maxPrice && <FilterChip label={`Max $${maxPrice}`} onRemove={() => removeFilter("maxPrice")} />}
                {inStockOnly && <FilterChip label="In stock only" onRemove={() => removeFilter("inStock")} />}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-medium text-gray-400 hover:text-red-600 transition px-1.5"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="pt-1">
            {loading && (
              <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-5" : "space-y-3"}>
                {Array.from({ length: viewMode === "grid" ? 6 : 5 }).map((_, i) =>
                  viewMode === "grid" ? (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                      <div className="aspect-square bg-gray-100" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                        <div className="h-5 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 animate-pulse">
                      <div className="w-20 h-20 rounded-lg bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                        <div className="h-4 bg-gray-100 rounded w-1/6" />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && visibleProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center">
                <PackageSearch className="mx-auto text-gray-300 mb-3" size={36} />
                <p className="text-sm font-medium text-gray-700">No products match your filters</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or clearing filters.</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!loading && !error && visibleProducts.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pb-8">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.productId}
                    product={product}
                    onClick={() => navigate(`/products/${product.productId}`)}
                  />
                ))}
              </div>
            )}

            {!loading && !error && visibleProducts.length > 0 && viewMode === "list" && (
              <div className="space-y-3 pb-8">
                {visibleProducts.map((product) => (
                  <ProductListRow
                    key={product.productId}
                    product={product}
                    onClick={() => navigate(`/products/${product.productId}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSidebar({
  categories, categoryId, minPrice, maxPrice, inStockOnly, hasActiveFilters,
  onSelectCategory, onChangeMinPrice, onChangeMaxPrice, onToggleInStock, onClearAll,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-6">
      <div className="hidden lg:flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <SlidersHorizontal size={14} /> Filters
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Category</h3>
        <div className="space-y-1">
          <SidebarOption
            label="All categories"
            active={!categoryId}
            onClick={() => onSelectCategory("")}
          />
          {categories.map((c) => (
            <SidebarOption
              key={c.categoryId}
              label={c.name}
              active={categoryId === String(c.categoryId)}
              onClick={() => onSelectCategory(String(c.categoryId))}
            />
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Price range</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => onChangeMinPrice(e.target.value)}
              placeholder="Min"
              className="w-full rounded-lg border border-gray-300 pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-gray-300 text-sm">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => onChangeMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-full rounded-lg border border-gray-300 pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Availability</h3>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onToggleInStock(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          In stock only
        </label>
      </div>
    </div>
  );
}

function SidebarOption({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition ${
        active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full pl-2.5 pr-1.5 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-indigo-400 hover:text-indigo-700 rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function ProductListRow({ product, onClick }) {
  const { addItem } = useCart();
  const outOfStock = product.stockQuantity === 0;

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    const result = await addItem(product, 1);
    setAdding(false);
    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="w-20 h-20 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-200 relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImageOff size={20} />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-gray-700 bg-white px-1.5 py-0.5 rounded-full">Out</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">{product.categoryName}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
        {product.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-base font-semibold text-gray-900">${product.price.toFixed(2)}</p>
          {!outOfStock && product.stockQuantity < 5 && (
            <p className="text-xs font-medium text-amber-600 mt-0.5">{product.stockQuantity} left</p>
          )}
        </div>

        {!outOfStock && (
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={adding}
            title="Quick add to cart"
            className={`flex items-center justify-center w-9 h-9 rounded-full transition shrink-0 ${
              added ? "bg-green-600" : "bg-indigo-600 hover:bg-indigo-700"
            } text-white disabled:opacity-70`}
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : added ? <Check size={15} /> : <ShoppingCart size={15} />}
          </button>
        )}
      </div>
    </button>
  );
}