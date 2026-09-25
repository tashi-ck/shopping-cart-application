import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowRight, ArrowLeft, Check, DollarSign, Sparkles, Tag } from "lucide-react";
import { getCategories } from "../api/categoryApi";
import { submitOnboarding } from "../api/onboardingApi";
import { useAppUser } from "../context/AppUserContext";

const PRIORITY_OPTIONS = [
  { value: "Price", label: "Best price", description: "Show me deals and the most affordable options first." },
  { value: "Quality", label: "Best quality", description: "Show me well-reviewed, higher-end products first." },
  { value: "Trending", label: "What's new", description: "Show me the newest arrivals first." },
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshAppUser } = useAppUser();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [priority, setPriority] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .finally(() => setLoadingCategories(false));
  }, []);

  const toggleCategory = (categoryId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const canProceedFromStep1 = selectedCategoryIds.length > 0;
  const canProceedFromStep2 =
    minBudget === "" || maxBudget === "" || Number(minBudget) <= Number(maxBudget);
  const canSubmit = priority !== "";

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const finishOnboarding = async (payload) => {
    setError("");
    setSubmitting(true);
    try {
      await submitOnboarding(payload);
      await refreshAppUser();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data ?? "Couldn't save your preferences. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSubmit = () =>
    finishOnboarding({
      preferredCategoryIds: selectedCategoryIds,
      minBudget: minBudget === "" ? null : Number(minBudget),
      maxBudget: maxBudget === "" ? null : Number(maxBudget),
      shoppingPriority: priority,
    });

  // Skipping still marks onboarding complete (with defaults) so the person
  // isn't shown this wizard again on every subsequent visit.
  const handleSkip = () =>
    finishOnboarding({
      preferredCategoryIds: [],
      minBudget: null,
      maxBudget: null,
      shoppingPriority: "Trending",
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200">
            <ShoppingBag size={18} className="text-white" />
          </span>
          <span className="text-xl font-semibold text-gray-900">Go Shopping</span>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 p-6 sm:p-10">
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i + 1 <= step ? "bg-indigo-600" : "bg-gray-100"
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
            Step {step} of {TOTAL_STEPS}
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <Tag size={22} className="text-indigo-600" /> What are you shopping for?
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Pick a few categories you're interested in — you can change this anytime.
              </p>

              {loadingCategories ? (
                <p className="text-sm text-gray-400">Loading categories...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((c) => {
                    const active = selectedCategoryIds.includes(c.categoryId);
                    return (
                      <button
                        key={c.categoryId}
                        type="button"
                        onClick={() => toggleCategory(c.categoryId)}
                        className={`relative text-left rounded-xl border-2 p-4 transition ${
                          active ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        )}
                        <p className={`text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"}`}>
                          {c.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <DollarSign size={22} className="text-indigo-600" /> What's your typical budget?
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                This helps us show products in the range you actually shop in. Leave blank if you'd rather not say.
              </p>

              <div className="flex items-center gap-3 max-w-sm">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Min ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-gray-300 mt-5">–</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Max ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    placeholder="Any"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!canProceedFromStep2 && (
                <p className="text-xs text-red-600 mt-2">Min budget can't be higher than max budget.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <Sparkles size={22} className="text-indigo-600" /> What matters most to you?
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                We'll use this to decide what to show you first on your recommendations.
              </p>

              <div className="space-y-3">
                {PRIORITY_OPTIONS.map((opt) => {
                  const active = priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition flex items-start gap-3 ${
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
                        <p className={`text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition disabled:opacity-50"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-sm font-medium text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
            </div>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={(step === 1 && !canProceedFromStep1) || (step === 2 && !canProceedFromStep2)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                {submitting ? "Saving..." : "Finish"} <Check size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}