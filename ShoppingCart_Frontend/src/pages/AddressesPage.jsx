import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Star, ArrowLeft } from "lucide-react";
import { getAddresses, createAddress, updateAddress, deleteAddress } from "../api/addressApi";

const emptyForm = { label: "", fullAddress: "", isDefault: false };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creating, id = editing that address
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    getAddresses()
      .then((res) => setAddresses(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const startEdit = (address) => {
    setEditingId(address.addressId);
    setForm({ label: address.label, fullAddress: address.fullAddress, isDefault: address.isDefault });
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingId) {
        await updateAddress(editingId, form);
      } else {
        await createAddress(form);
      }
      setShowForm(false);
      load(); // re-fetch — simplest way to correctly reflect any default-address reassignment
    } catch (err) {
      setFormError(err.response?.data ?? "Couldn't save this address.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId) => {
    await deleteAddress(addressId);
    setAddresses((prev) => prev.filter((a) => a.addressId !== addressId));
    setConfirmingDeleteId(null);
  };

  return (
    <div className="max-w-2xl">
      <Link to="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6 w-fit">
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Saved Addresses</h1>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700 transition"
          >
            <Plus size={14} /> Add address
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">{editingId ? "Edit address" : "New address"}</h2>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              placeholder="e.g. Home, Work"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <textarea
              value={form.fullAddress}
              onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
              required
              rows={3}
              placeholder="Street address, city, postal code..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded border-gray-300"
            />
            Set as default
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No saved addresses yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.addressId} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">{a.label}</p>
                    {a.isDefault && (
                      <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        <Star size={11} fill="currentColor" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{a.fullAddress}</p>
                </div>

                <div className="flex gap-3 shrink-0 ml-4">
                  <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-indigo-600">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setConfirmingDeleteId(a.addressId)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {confirmingDeleteId === a.addressId && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-700">Delete "{a.label}"?</span>
                  <button
                    onClick={() => handleDelete(a.addressId)}
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}