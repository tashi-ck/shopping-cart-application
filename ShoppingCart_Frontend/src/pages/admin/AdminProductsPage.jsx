import { useEffect, useState } from "react";
import { Pencil, Save, X, Trash2, Plus, EyeOff, Eye } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct, setProductActive } from "../../api/productApi";
import { getCategories } from "../../api/categoryApi";
import ImageUpload from "../../components/admin/ImageUpload";

const emptyForm = { categoryId: "", name: "", description: "", price: "", stockQuantity: "", imageUrl: "" };

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

 const load = () => {
  setLoading(true);
  Promise.all([getProducts({ includeInactive: true }), getCategories()])
    .then(([productsRes, categoriesRes]) => {
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    })
    .finally(() => setLoading(false));
  };
  
  useEffect(() => {
    load();
  }, []);

  const toPayload = (f) => ({
    categoryId: Number(f.categoryId),
    name: f.name,
    description: f.description || null,
    price: Number(f.price),
    stockQuantity: Number(f.stockQuantity),
    imageUrl: f.imageUrl || null,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await createProduct(toPayload(form));
      setProducts((prev) => [res.data, ...prev]);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err.response?.data ?? "Couldn't create product.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p.productId);
    setEditForm({
      categoryId: p.categoryId,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      stockQuantity: p.stockQuantity,
      imageUrl: p.imageUrl ?? "",
    });
  };

  const handleSaveEdit = async (productId) => {
    await updateProduct(productId, toPayload(editForm));
    const category = categories.find((c) => c.categoryId === Number(editForm.categoryId));
    setProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, ...toPayload(editForm), categoryName: category?.name ?? p.categoryName }
          : p
      )
    );
    setEditingId(null);
  };

  const handleDelete = async (productId) => {
    setDeleteError("");
    try {
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.productId !== productId));
      setConfirmingDeleteId(null);
    } catch (err) {
      // This is expected for any product that's part of an order — deactivate instead in that case.
      setDeleteError(
        err.response?.data ??
          "Couldn't delete this product — it's referenced by an existing order. Try deactivating it instead."
      );
    }
  };

  const handleToggleActive = async (product) => {
    setTogglingId(product.productId);
    const newActive = !product.isActive;
    try {
      await setProductActive(product.productId, newActive);
      setProducts((prev) =>
        prev.map((p) => (p.productId === product.productId ? { ...p, isActive: newActive } : p))
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your catalog.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={15} /> New product
        </h2>
        {formError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
              <input
                type="number" step="0.01" min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
              <input
                type="number" min="0"
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <ImageUpload
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? "Adding..." : "Add product"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {deleteError && (
          <div className="m-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {deleteError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No products yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) =>
                editingId === p.productId ? (
                  <tr key={p.productId} className="border-b border-gray-100">
                    <td colSpan={6} className="p-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <select
                          value={editForm.categoryId}
                          onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          {categories.map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                          ))}
                        </select>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="mb-3">
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={2}
                          placeholder="Description"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3 items-start">
                        <input
                          type="number" step="0.01"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                        <input
                          type="number"
                          value={editForm.stockQuantity}
                          onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                        <ImageUpload
                          value={editForm.imageUrl}
                          onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(p.productId)}
                          className="flex items-center gap-1 text-xs font-medium bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700"
                        >
                          <Save size={13} /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                        >
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : confirmingDeleteId === p.productId ? (
                  <tr key={p.productId} className="border-b border-gray-100">
                    <td colSpan={6} className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-700">Permanently delete "{p.name}"?</span>
                        <button
                          onClick={() => handleDelete(p.productId)}
                          className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.productId} className={`border-b border-gray-100 last:border-0 ${!p.isActive ? "opacity-50" : ""}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 shrink-0" />
                        )}
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-500">{p.categoryName}</td>
                    <td className="p-3 text-gray-700">${Number(p.price).toFixed(2)}</td>
                    <td className={`p-3 ${p.stockQuantity < 5 ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {p.stockQuantity}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleToggleActive(p)}
                          disabled={togglingId === p.productId}
                          title={p.isActive ? "Deactivate (hide from store)" : "Reactivate (show in store)"}
                          className="text-gray-400 hover:text-amber-600 disabled:opacity-40"
                        >
                          {p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-indigo-600">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmingDeleteId(p.productId)} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}