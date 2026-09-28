import { useEffect, useState } from "react";
import { Pencil, Save, X, Trash2, Plus } from "lucide-react";
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from "../../api/policyApi";

const emptyForm = { slug: "", title: "", content: "" };

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    getPolicies()
      .then((res) => setPolicies(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await createPolicy(form);
      setPolicies((prev) => [...prev, res.data].sort((a, b) => a.title.localeCompare(b.title)));
      setForm(emptyForm);
    } catch (err) {
      setFormError(err.response?.data ?? "Couldn't create policy.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (policy) => {
    setEditingId(policy.policyId);
    setEditForm({ title: policy.title, content: policy.content });
  };

  const handleSaveEdit = async (policyId) => {
    await updatePolicy(policyId, editForm);
    setPolicies((prev) =>
      prev.map((p) => (p.policyId === policyId ? { ...p, ...editForm } : p))
    );
    setEditingId(null);
  };

  const handleDelete = async (policyId) => {
    await deletePolicy(policyId);
    setPolicies((prev) => prev.filter((p) => p.policyId !== policyId));
    setConfirmingDeleteId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Policies</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the policy content shown on the Policies page and used by the chatbot.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={15} /> New policy
        </h2>
        {formError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. shipping"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Shipping Policy"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? "Adding..." : "Add policy"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading...</p>
        ) : policies.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No policies yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {policies.map((p) => (
              <div key={p.policyId} className="p-5">
                {editingId === p.policyId ? (
                  <div className="space-y-3">
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
                    />
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(p.policyId)}
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
                  </div>
                ) : confirmingDeleteId === p.policyId ? (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700">Delete "{p.title}"?</span>
                    <button
                      onClick={() => handleDelete(p.policyId)}
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
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">/{p.slug}</p>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.content}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-indigo-600">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setConfirmingDeleteId(p.policyId)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}