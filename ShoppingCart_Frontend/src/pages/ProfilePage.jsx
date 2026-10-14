import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Mail, Plus, Pencil, Trash2, Star, User, MapPin, SlidersHorizontal, Check,
  ShoppingBag, Loader2, CheckCircle2, Info,
} from "lucide-react";
import { useAppUser } from "../context/AppUserContext";
import { getAddresses, createAddress, updateAddress, deleteAddress } from "../api/addressApi";
import { getCategories } from "../api/categoryApi";
import { getPreferences, updatePreferences } from "../api/onboardingApi";
import { getInitials } from "../utils/avatar";

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
];

const PRIORITY_OPTIONS = [
  { value: "Price", label: "Best price", description: "Show me deals and the most affordable options first." },
  { value: "Quality", label: "Best quality", description: "Show me well-reviewed, higher-end products first." },
  { value: "Trending", label: "What's new", description: "Show me the newest arrivals first." },
];

const errorMessage = (err, fallback) =>
  typeof err?.response?.data === "string" && err.response.data ? err.response.data : fallback;

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------
function ProfileTab({ appUser, prefs, categories, loadingPrefs, onEditPreferences }) {
  const displayName = [appUser?.firstName, appUser?.lastName].filter(Boolean).join(" ");
  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.value === prefs?.shoppingPriority)?.label;
  const categoryNames = (prefs?.preferredCategoryIds ?? [])
    .map((id) => categories.find((c) => c.categoryId === id)?.name)
    .filter(Boolean);

  const hasBudget = prefs?.minBudget != null || prefs?.maxBudget != null;
  const budgetText = hasBudget
    ? `$${prefs.minBudget ?? 0} – ${prefs.maxBudget != null ? `$${prefs.maxBudget}` : "any"}`
    : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Account details</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900 font-medium text-right">{displayName || "Not set"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900 font-medium text-right break-all">{appUser?.email}</dd>
          </div>
        </dl>
        <p className="flex items-start gap-1.5 text-xs text-gray-400 mt-4">
          <Info size={13} className="mt-0.5 shrink-0" />
          Your name and email come from your login account and can't be changed here.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Shopping preferences</h2>
          <button
            type="button"
            onClick={onEditPreferences}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Edit
          </button>
        </div>

        {loadingPrefs ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : categoryNames.length === 0 && !budgetText && !priorityLabel ? (
          <p className="text-sm text-gray-500">
            You haven't set any preferences yet. Add some to get better "Picked for you" recommendations.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Interested in</p>
              {categoryNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {categoryNames.map((n) => (
                    <span key={n} className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-1">
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Any category</p>
              )}
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Budget</span>
              <span className="text-gray-900 font-medium">{budgetText ?? "No limit"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Priority</span>
              <span className="text-gray-900 font-medium">{priorityLabel ?? "—"}</span>
            </div>
          </div>
        )}
      </div>

      <Link
        to="/orders"
        className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-6 py-4 hover:border-gray-300 hover:shadow-sm transition"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <ShoppingBag size={16} className="text-indigo-600" /> My orders
        </span>
        <span className="text-xs text-gray-400">View history →</span>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Addresses tab
// ---------------------------------------------------------------------------
const emptyAddressForm = { label: "", fullAddress: "", isDefault: false };

function AddressesTab() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddressForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    setLoading(true);
    setLoadError("");
    getAddresses()
      .then((res) => setAddresses(res.data))
      .catch(() => setLoadError("Couldn't load your addresses."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyAddressForm);
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
      if (editingId) await updateAddress(editingId, form);
      else await createAddress(form);
      setShowForm(false);
      load(); // re-fetch so default-address reassignment is reflected correctly
    } catch (err) {
      setFormError(errorMessage(err, "Couldn't save this address."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId) => {
    setDeleteError("");
    try {
      await deleteAddress(addressId);
      setAddresses((prev) => prev.filter((a) => a.addressId !== addressId));
      setConfirmingDeleteId(null);
    } catch (err) {
      setDeleteError(errorMessage(err, "Couldn't delete this address."));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Saved addresses</h2>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition"
          >
            <Plus size={14} /> Add address
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">{editingId ? "Edit address" : "New address"}</h3>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              placeholder="e.g. Home, Work"
              className={inputClass}
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
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-red-600 mb-2">{loadError}</p>
          <button onClick={load} className="text-sm font-medium text-red-700 underline">Try again</button>
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <MapPin className="mx-auto text-gray-300 mb-3" size={30} />
          <p className="text-sm font-medium text-gray-700">No saved addresses yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Save one now and checkout gets faster.</p>
          <button
            type="button"
            onClick={startCreate}
            className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
          >
            Add your first address
          </button>
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
                  <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-indigo-600" aria-label={`Edit ${a.label}`}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteError("");
                      setConfirmingDeleteId(a.addressId);
                    }}
                    className="text-gray-400 hover:text-red-600"
                    aria-label={`Delete ${a.label}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {confirmingDeleteId === a.addressId && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
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
                  {deleteError && <p className="text-xs text-red-600 mt-2">{deleteError}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preferences tab
// ---------------------------------------------------------------------------
function PreferencesTab({ categories, loadingCategories, saved, loading, loadError, onSaved, onRetry }) {
  const [categoryIds, setCategoryIds] = useState([]);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [priority, setPriority] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Re-sync the form whenever the saved copy changes (initial load, or after a save).
  useEffect(() => {
    setCategoryIds(saved?.preferredCategoryIds ?? []);
    setMinBudget(saved?.minBudget != null ? String(saved.minBudget) : "");
    setMaxBudget(saved?.maxBudget != null ? String(saved.maxBudget) : "");
    setPriority(saved?.shoppingPriority ?? "");
  }, [saved]);

  const budgetInvalid = minBudget !== "" && maxBudget !== "" && Number(minBudget) > Number(maxBudget);

  const dirty = useMemo(() => {
    const savedIds = [...(saved?.preferredCategoryIds ?? [])].sort().join(",");
    return (
      savedIds !== [...categoryIds].sort().join(",") ||
      String(saved?.minBudget ?? "") !== minBudget ||
      String(saved?.maxBudget ?? "") !== maxBudget ||
      (saved?.shoppingPriority ?? "") !== priority
    );
  }, [saved, categoryIds, minBudget, maxBudget, priority]);

  const toggleCategory = (id) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleReset = () => {
    setCategoryIds(saved?.preferredCategoryIds ?? []);
    setMinBudget(saved?.minBudget != null ? String(saved.minBudget) : "");
    setMaxBudget(saved?.maxBudget != null ? String(saved.maxBudget) : "");
    setPriority(saved?.shoppingPriority ?? "");
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (budgetInvalid) return;

    setError("");
    setSaving(true);
    setJustSaved(false);

    const payload = {
      preferredCategoryIds: categoryIds,
      minBudget: minBudget === "" ? null : Number(minBudget),
      maxBudget: maxBudget === "" ? null : Number(maxBudget),
      // The backend falls back to "Trending" for anything unrecognized, so mirror that here.
      shoppingPriority: priority || "Trending",
    };

    try {
      await updatePreferences(payload);
      onSaved(payload);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your preferences."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingCategories) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-red-600 mb-2">{loadError}</p>
        <button onClick={onRetry} className="text-sm font-medium text-red-700 underline">Try again</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-gray-500">
        These drive your "Picked for you" recommendations. Change them any time.
      </p>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Categories you like</h2>
        <p className="text-xs text-gray-400 mb-4">Leave all unselected to see everything.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {categories.map((c) => {
            const active = categoryIds.includes(c.categoryId);
            return (
              <button
                key={c.categoryId}
                type="button"
                onClick={() => toggleCategory(c.categoryId)}
                aria-pressed={active}
                className={`relative text-left rounded-xl border-2 px-3.5 py-3 transition ${
                  active ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check size={10} />
                  </span>
                )}
                <span className={`text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"}`}>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Typical budget</h2>
        <p className="text-xs text-gray-400 mb-4">Leave blank for no limit.</p>
        <div className="flex items-center gap-3 max-w-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Min ($)</label>
            <input
              type="number" min="0" value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              placeholder="0" className={inputClass}
            />
          </div>
          <span className="text-gray-300 mt-5">–</span>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Max ($)</label>
            <input
              type="number" min="0" value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Any" className={inputClass}
            />
          </div>
        </div>
        {budgetInvalid && <p className="text-xs text-red-600 mt-2">Min budget can't be higher than max budget.</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">What matters most</h2>
        <div className="space-y-2.5">
          {PRIORITY_OPTIONS.map((opt) => {
            const active = priority === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                aria-pressed={active}
                className={`w-full text-left rounded-xl border-2 p-3.5 transition flex items-start gap-3 ${
                  active ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active ? "border-indigo-600 bg-indigo-600" : "border-gray-300"
                  }`}
                >
                  {active && <Check size={12} className="text-white" />}
                </span>
                <span>
                  <span className={`block text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"}`}>{opt.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || saving || budgetInvalid}
          className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving..." : "Save preferences"}
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            Discard changes
          </button>
        )}
        {justSaved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 size={15} /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ProfilePage() {
  const { appUser } = useAppUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : "profile";

  const setTab = (key) =>
    setSearchParams(key === "profile" ? {} : { tab: key }, { replace: true });

  // Categories + saved preferences are shared by the Profile summary and the
  // Preferences form, so they load once here rather than in each tab.
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [prefs, setPrefs] = useState(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [prefsError, setPrefsError] = useState("");

  const loadPrefs = () => {
    setLoadingPrefs(true);
    setPrefsError("");
    getPreferences()
      .then((res) => setPrefs(res.data))
      .catch(() => setPrefsError("Couldn't load your preferences."))
      .finally(() => setLoadingPrefs(false));
  };

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
    loadPrefs();
  }, []);

  const displayName = [appUser?.firstName, appUser?.lastName].filter(Boolean).join(" ");

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xl font-semibold flex items-center justify-center shrink-0 shadow-sm">
            {getInitials(appUser?.firstName, appUser?.lastName, appUser?.email)}
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">{displayName || "Your account"}</h1>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 truncate">
              <Mail size={13} className="shrink-0" /> {appUser?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "profile" && (
          <ProfileTab
            appUser={appUser}
            prefs={prefs}
            categories={categories}
            loadingPrefs={loadingPrefs || loadingCategories}
            onEditPreferences={() => setTab("preferences")}
          />
        )}
        {activeTab === "addresses" && <AddressesTab />}
        {activeTab === "preferences" && (
          <PreferencesTab
            categories={categories}
            loadingCategories={loadingCategories}
            saved={prefs}
            loading={loadingPrefs}
            loadError={prefsError}
            onSaved={setPrefs}
            onRetry={loadPrefs}
          />
        )}
      </div>
    </div>
  );
}