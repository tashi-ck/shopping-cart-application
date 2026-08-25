import { useEffect, useState } from "react";
import { Pencil, Save, X, Trash2, Plus } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../../api/categoryApi";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const loadCategories = () => {
    setLoading(true);
    getCategories()
      .then((res) => setCategories(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await createCategory(form);
      setCategories((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", description: "" });
    } catch (err) {
      setFormError(err.response?.data ?? "Couldn't create category.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (category) => {
    setEditingId(category.categoryId);
    setEditForm({ name: category.name, description: category.description ?? "" });
  };

  const handleSaveEdit = async (categoryId) => {
    await updateCategory(categoryId, editForm);
    setCategories((prev) =>
      prev.map((c) => (c.categoryId === categoryId ? { ...c, ...editForm } : c))
    );
    setEditingId(null);
  };

  const handleDelete = async (categoryId) => {
    await deleteCategory(categoryId);
    setCategories((prev) => prev.filter((c) => c.categoryId !== categoryId));
    setConfirmingDeleteId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <p className="text-sm text-gray-500 mt-1">Manage product categories.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={15} /> New category
        </h2>
        {formError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreate} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-[2] min-w-[220px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No categories yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {categories.map((c) => (
                <tr key={c.categoryId} className="border-b border-gray-100 last:border-0">
                  {editingId === c.categoryId ? (
                    <td className="p-4">
                      <div className="flex gap-3 items-center flex-wrap">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm flex-1 min-w-[140px]"
                        />
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm flex-[2] min-w-[200px]"
                        />
                        <button onClick={() => handleSaveEdit(c.categoryId)} className="text-indigo-600 hover:text-indigo-800">
                          <Save size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  ) : confirmingDeleteId === c.categoryId ? (
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-700">Delete "{c.name}"?</span>
                        <button
                          onClick={() => handleDelete(c.categoryId)}
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
                  ) : (
                    <td className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.description && <p className="text-gray-500 text-xs mt-0.5">{c.description}</p>}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(c)} className="text-gray-400 hover:text-indigo-600">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setConfirmingDeleteId(c.categoryId)} className="text-gray-400 hover:text-red-600">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}