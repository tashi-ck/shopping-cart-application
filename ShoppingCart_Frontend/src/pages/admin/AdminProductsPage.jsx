import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Search, X, Pencil, Trash2, Eye, EyeOff, Loader2, PackageSearch,
  ChevronDown, ImageOff, CheckCircle2, AlertTriangle,
} from "lucide-react";
import {
  getProductsPaged, getProduct, createProduct, updateProduct, deleteProduct, setProductActive,
} from "../../api/productApi";
import { getCategories } from "../../api/categoryApi";
import ImageUpload from "../../components/admin/ImageUpload";
import ProductGalleryManager from "../../components/admin/ProductGalleryManager";
import Pagination from "../../components/Pagination";

const PAGE_SIZE = 15;
const LOW_STOCK_THRESHOLD = 5;

const SORT_OPTIONS = [
  { value: "", label: "Name (A–Z)" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const emptyForm = { categoryId: "", name: "", description: "", price: "", stockQuantity: "", imageUrl: "" };

const errorMessage = (err, fallback) =>
  typeof err?.response?.data === "string" && err.response.data ? err.response.data : fallback;

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Local input state that feels instant, pushed into the URL once typing settles.
function useDebouncedUrlParam(urlValue, key, updateParams, delayMs) {
  const [input, setInput] = useState(urlValue);
  const debounced = useDebouncedValue(input, delayMs);

  useEffect(() => {
    setInput(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (debounced === urlValue) return;
    updateParams({ [key]: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [input, setInput];
}

// ---------------------------------------------------------------------------
// Slide-over drawer: create or edit a product while the table stays visible
// ---------------------------------------------------------------------------
function ProductDrawer({ mode, product, categories, onClose, onSaved }) {
  const isEdit = mode === "edit";

  const initialForm = isEdit
    ? {
        categoryId: String(product.categoryId),
        name: product.name,
        description: product.description ?? "",
        price: String(product.price),
        stockQuantity: String(product.stockQuantity),
        imageUrl: product.imageUrl ?? "",
      }
    : emptyForm;

  const [form, setForm] = useState(initialForm);
  const initialSnapshot = useRef(JSON.stringify(initialForm));
  const dirty = JSON.stringify(form) !== initialSnapshot.current;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);

  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(isEdit);

  // Slide-in animation
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The list endpoint doesn't include gallery images, so fetch them for edit mode.
  // (Only `images` is used from this response: the single-product query doesn't
  // select IsActive, so it can't be trusted for the active flag.)
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    getProduct(product.productId)
      .then((res) => !cancelled && setImages(res.data.images ?? []))
      .catch(() => !cancelled && setImages([]))
      .finally(() => !cancelled && setLoadingImages(false));
    return () => {
      cancelled = true;
    };
  }, [isEdit, product]);

  const requestClose = () => {
    if (saving) return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);

    if (!form.categoryId) return setError("Please choose a category.");
    if (!form.name.trim()) return setError("Name is required.");
    if (!(price >= 0)) return setError("Price must be zero or more.");
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return setError("Stock must be a whole number, zero or more.");

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      stockQuantity,
      imageUrl: form.imageUrl || null,
    };

    setSaving(true);
    try {
      if (isEdit) await updateProduct(product.productId, payload);
      else await createProduct(payload);
      onSaved(mode);
    } catch (err) {
      setError(errorMessage(err, isEdit ? "Couldn't save changes." : "Couldn't create product."));
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    // z-[60] keeps the drawer above the floating chat button (z-50).
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={requestClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit product" : "New product"}
        className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl flex flex-col transition-transform duration-200 ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{isEdit ? "Edit product" : "New product"}</h2>
            {isEdit && <p className="text-xs text-gray-400 mt-0.5">ID #{product.productId}</p>}
          </div>
          <button type="button" onClick={requestClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
                className={inputClass}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Price ($)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                <input
                  type="number" min="0" step="1"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />

            <div className="pt-2 border-t border-gray-100">
              {isEdit ? (
                loadingImages ? (
                  <p className="text-xs text-gray-400">Loading gallery...</p>
                ) : (
                  <ProductGalleryManager productId={product.productId} images={images} onImagesChange={setImages} />
                )
              ) : (
                <p className="text-xs text-gray-400">
                  Save the product first, then edit it to add extra gallery images.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-white shrink-0">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
function ConfirmDeleteDialog({ product, busy, error, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div role="alertdialog" className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600 shrink-0">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Delete this product?</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">"{product.name}"</span> will be permanently removed.
              If it's part of an existing order, deactivate it instead.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-medium bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 shadow-lg border ${
        isError ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-gray-800 border-gray-200"
      }`}
    >
      {isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} className="text-green-600" />}
      {toast.message}
    </div>
  );
}

function StockCell({ quantity }) {
  if (quantity === 0) return <span className="text-red-600 font-medium">Out of stock</span>;
  if (quantity < LOW_STOCK_THRESHOLD) return <span className="text-amber-600 font-medium">{quantity} left</span>;
  return <span className="text-gray-700">{quantity}</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [drawer, setDrawer] = useState(null); // null | { mode: "create" } | { mode: "edit", product }
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [toast, setToast] = useState(null);

  const categoryId = searchParams.get("categoryId") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "";
  const urlSearch = searchParams.get("search") ?? "";
  const hideInactive = searchParams.get("hideInactive") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Any change other than the page itself sends the admin back to page 1.
  function updateParams(patch) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      });
      if (!("page" in patch)) next.delete("page");
      return next;
    });
  }

  const [searchInput, setSearchInput] = useDebouncedUrlParam(urlSearch, "search", updateParams, 350);

  const showToast = (type, message) => setToast({ type, message });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const goToPage = (nextPage) => {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelectedIds(new Set()); // selection never outlives the page/filter it was made on

    getProductsPaged({
      categoryId, search: urlSearch, sortBy, page, pageSize: PAGE_SIZE,
      includeInactive: !hideInactive,
    })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data.items);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => !cancelled && setError("Couldn't load products. Please try again."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [categoryId, urlSearch, sortBy, page, hideInactive, reloadKey]);

  // Deleting/deactivating the last rows of the final page can leave us past the end.
  useEffect(() => {
    if (loading) return;
    if (totalPages > 0 && page > totalPages) goToPage(totalPages);
    else if (totalCount === 0 && page > 1) goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, totalPages, totalCount, page]);

  const reload = () => setReloadKey((k) => k + 1);

  const hasActiveFilters = categoryId || urlSearch || sortBy || hideInactive;

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  // ---- selection ----
  const allOnPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p.productId));
  const someSelected = selectedIds.size > 0;

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allOnPageSelected;
  }, [someSelected, allOnPageSelected]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(allOnPageSelected ? new Set() : new Set(products.map((p) => p.productId)));

  // ---- actions ----
  const handleToggleActive = async (product) => {
    setTogglingId(product.productId);
    const next = !product.isActive;
    try {
      await setProductActive(product.productId, next);
      if (hideInactive && !next) reload(); // it no longer belongs in this filtered view
      else setProducts((prev) => prev.map((p) => (p.productId === product.productId ? { ...p, isActive: next } : p)));
      showToast("success", `"${product.name}" ${next ? "activated" : "deactivated"}.`);
    } catch (err) {
      showToast("error", errorMessage(err, "Couldn't update this product."));
    } finally {
      setTogglingId(null);
    }
  };

  const handleBulkSetActive = async (active) => {
    const targets = products.filter((p) => selectedIds.has(p.productId) && p.isActive !== active);
    if (targets.length === 0) {
      showToast("success", `Everything selected is already ${active ? "active" : "inactive"}.`);
      return;
    }

    setBulkBusy(true);
    const results = await Promise.allSettled(targets.map((p) => setProductActive(p.productId, active)));
    const succeeded = new Set(targets.filter((_, i) => results[i].status === "fulfilled").map((p) => p.productId));
    const failed = targets.length - succeeded.size;

    if (hideInactive && !active) reload();
    else setProducts((prev) => prev.map((p) => (succeeded.has(p.productId) ? { ...p, isActive: active } : p)));

    setSelectedIds(new Set());
    setBulkBusy(false);

    const verb = active ? "activated" : "deactivated";
    if (failed === 0) showToast("success", `${succeeded.size} ${succeeded.size === 1 ? "product" : "products"} ${verb}.`);
    else showToast("error", `${succeeded.size} ${verb}, ${failed} failed.`);
  };

  const handleSaved = (mode) => {
    setDrawer(null);
    if (mode === "create") {
      // Jump to "newest first" with no filters so the new product is visible at the top.
      setSearchInput("");
      updateParams({ sortBy: "newest", search: null, categoryId: null });
      showToast("success", "Product created.");
    } else {
      showToast("success", "Changes saved.");
    }
    reload();
  };

  const handleConfirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteProduct(deleting.productId);
      showToast("success", `"${deleting.name}" deleted.`);
      setDeleting(null);
      reload();
    } catch (err) {
      setDeleteError(
        errorMessage(err, "Couldn't delete this product — it may be part of an existing order. Try deactivating it instead.")
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "Loading catalog..." : `${totalCount} ${totalCount === 1 ? "product" : "products"}${hasActiveFilters ? " match your filters" : " in your catalog"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-indigo-700 transition shrink-0"
        >
          <Plus size={15} /> New product
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by product name..."
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

          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => updateParams({ categoryId: e.target.value || null })}
              aria-label="Filter by category"
              className="appearance-none rounded-lg border border-gray-300 pl-3 pr-8 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => updateParams({ sortBy: e.target.value || null })}
              aria-label="Sort products"
              className="appearance-none rounded-lg border border-gray-300 pl-3 pr-8 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!hideInactive}
              onChange={(e) => updateParams({ hideInactive: e.target.checked ? null : "1" })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show inactive
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-gray-400 hover:text-red-600 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-900">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleBulkSetActive(true)}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye size={13} /> Activate
            </button>
            <button
              type="button"
              onClick={() => handleBulkSetActive(false)}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <EyeOff size={13} /> Deactivate
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 px-2 py-1.5"
            >
              Clear
            </button>
            {bulkBusy && <Loader2 size={15} className="animate-spin text-indigo-600" />}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={reload} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Try again</button>
          </div>
        ) : !loading && products.length === 0 ? (
          <div className="p-14 text-center">
            <PackageSearch className="mx-auto text-gray-300 mb-3" size={36} />
            <p className="text-sm font-medium text-gray-700">
              {hasActiveFilters ? "No products match your filters" : "No products yet"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters ? "Try a different search or clear the filters." : "Create your first product to get started."}
            </p>
            <button
              onClick={hasActiveFilters ? clearFilters : () => setDrawer({ mode: "create" })}
              className="mt-4 text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
            >
              {hasActiveFilters ? "Clear filters" : "New product"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      disabled={loading || products.length === 0}
                      aria-label="Select all products on this page"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3 hidden md:table-cell">Category</th>
                  <th className="text-left p-3">Price</th>
                  <th className="text-left p-3">Stock</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-gray-100 animate-pulse">
                        <td className="p-3"><div className="h-4 w-4 bg-gray-100 rounded" /></td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                            <div className="h-4 bg-gray-100 rounded w-40" />
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                        <td className="p-3"><div className="h-4 bg-gray-100 rounded w-14" /></td>
                        <td className="p-3"><div className="h-4 bg-gray-100 rounded w-10" /></td>
                        <td className="p-3"><div className="h-5 bg-gray-100 rounded-full w-16" /></td>
                        <td className="p-3"><div className="h-4 bg-gray-100 rounded w-20 ml-auto" /></td>
                      </tr>
                    ))
                  : products.map((p) => {
                      const selected = selectedIds.has(p.productId);
                      return (
                        <tr
                          key={p.productId}
                          className={`border-t border-gray-100 transition ${selected ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(p.productId)}
                              aria-label={`Select ${p.name}`}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className={`p-3 ${!p.isActive ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt=""
                                  loading="lazy"
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
                                  <ImageOff size={14} className="text-gray-300" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setDrawer({ mode: "edit", product: p })}
                                className="font-medium text-gray-900 hover:text-indigo-600 text-left transition"
                              >
                                {p.name}
                              </button>
                            </div>
                          </td>
                          <td className={`p-3 text-gray-500 hidden md:table-cell ${!p.isActive ? "opacity-50" : ""}`}>
                            {p.categoryName}
                          </td>
                          <td className={`p-3 text-gray-700 ${!p.isActive ? "opacity-50" : ""}`}>
                            ${Number(p.price).toFixed(2)}
                          </td>
                          <td className={`p-3 ${!p.isActive ? "opacity-50" : ""}`}>
                            <StockCell quantity={p.stockQuantity} />
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {p.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(p)}
                                disabled={togglingId === p.productId}
                                title={p.isActive ? "Deactivate (hide from store)" : "Activate (show in store)"}
                                className="text-gray-400 hover:text-amber-600 disabled:opacity-40"
                              >
                                {p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDrawer({ mode: "edit", product: p })}
                                title="Edit"
                                className="text-gray-400 hover:text-indigo-600"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError("");
                                  setDeleting(p);
                                }}
                                title="Delete"
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onChange={goToPage}
        />
      )}

      {drawer && (
        <ProductDrawer
          // Remount per target so form state never leaks between products.
          key={drawer.mode === "edit" ? `edit-${drawer.product.productId}` : "create"}
          mode={drawer.mode}
          product={drawer.product}
          categories={categories}
          onClose={() => setDrawer(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          product={deleting}
          busy={deleteBusy}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}