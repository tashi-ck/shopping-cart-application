import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  MapPin, Mail, ShoppingBag, Plus, Check, ArrowLeft, AlertTriangle, ShieldCheck,
  Lock, Truck, RotateCcw, Loader2,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { createCheckoutSession, createGuestCheckoutSession } from "../api/paymentApi";
import { getAddresses } from "../api/addressApi";

const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_ADDRESS_LENGTH = 10;

function validateEmail(value) {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address.";
  return "";
}

function validateAddress(value) {
  if (!value.trim()) return "Shipping address is required.";
  if (value.trim().length < MIN_ADDRESS_LENGTH) return "Please enter your full address (street, city, postal code).";
  return "";
}

function Steps({ current }) {
  const steps = ["Cart", "Details", "Payment"];
  return (
    <ol className="flex items-center gap-2 text-xs mb-6" aria-label="Checkout progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${
                done ? "bg-green-600 text-white" : active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              {done ? <Check size={12} /> : i + 1}
            </span>
            <span className={active ? "font-medium text-gray-900" : "text-gray-400"}>{label}</span>
            {i < steps.length - 1 && <span className="w-8 h-px bg-gray-200" />}
          </li>
        );
      })}
    </ol>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-red-600 mt-1">
      {message}
    </p>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Icon size={15} className="text-indigo-600" /> {title}
      </h2>
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const { isAuthenticated } = useAuth0();
  const { cart, isLoading } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [touched, setTouched] = useState({ email: false, address: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emailRef = useRef(null);
  const addressRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingAddresses(false);
      return;
    }
    getAddresses()
      .then((res) => {
        setAddresses(res.data);
        const defaultAddress = res.data.find((a) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress.addressId));
          setShippingAddress(defaultAddress.fullAddress);
        }
      })
      .catch(() => {}) // saved addresses are a convenience, typing one still works
      .finally(() => setLoadingAddresses(false));
  }, [isAuthenticated]);

  const handleSelectAddress = (e) => {
    const value = e.target.value;
    setSelectedAddressId(value);
    if (value === "") {
      setShippingAddress("");
    } else {
      const address = addresses.find((a) => String(a.addressId) === value);
      setShippingAddress(address?.fullAddress ?? "");
    }
  };

  const emailError = !isAuthenticated ? validateEmail(guestEmail) : "";
  const addressError = validateAddress(shippingAddress);

  const showEmailError = touched.email && emailError;
  const showAddressError = touched.address && addressError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched({ email: true, address: true });

    // Focus the first invalid field so the person lands on what to fix.
    if (emailError) return emailRef.current?.focus();
    if (addressError) return addressRef.current?.focus();

    setSubmitting(true);
    try {
      if (isAuthenticated) {
        const res = await createCheckoutSession(shippingAddress.trim());
        window.location.href = res.data.url;
      } else {
        const items = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        const res = await createGuestCheckoutSession(guestEmail.trim(), shippingAddress.trim(), items);
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(
        typeof err?.response?.data === "string" && err.response.data
          ? err.response.data
          : "Couldn't start checkout. Please try again."
      );
      setSubmitting(false);
    }
  };

  if (isLoading || cart === null) {
    return (
      <div className="animate-pulse max-w-4xl">
        <div className="h-8 bg-gray-100 rounded w-40 mb-6" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-80 bg-gray-100 rounded-2xl" />
          <div className="lg:col-span-2 h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto">
        <ShoppingBag className="mx-auto text-gray-300 mb-3" size={36} />
        <p className="text-sm font-medium text-gray-700">Your cart is empty</p>
        <p className="text-sm text-gray-400 mt-1 mb-5">There's nothing to check out yet.</p>
        <Link
          to="/"
          className="inline-block text-sm font-medium bg-indigo-600 text-white rounded-lg px-5 py-2.5 hover:bg-indigo-700 transition"
        >
          Browse products
        </Link>
      </div>
    );
  }

  // The server would reject these, so surface them before sending the person to Stripe.
  const stockProblems = cart.items.filter((i) => i.stockQuantity === 0 || i.quantity > i.stockQuantity);
  const blocked = stockProblems.length > 0;
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  const inputClass = (hasError) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-300 focus:ring-red-400"
        : "border-gray-300 focus:ring-indigo-500"
    }`;

  const selectedAddress = addresses.find((a) => String(a.addressId) === selectedAddressId);

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between gap-4 mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Checkout</h1>
        <Link to="/cart" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft size={14} /> Back to cart
        </Link>
      </div>

      <Steps current={1} />

      <form onSubmit={handleSubmit} noValidate className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ---------------- Left: details ---------------- */}
        <div className="lg:col-span-3 space-y-4">
          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {blocked && (
            <div role="alert" className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {stockProblems.length === 1 ? "One item in your cart is" : `${stockProblems.length} items in your cart are`} no
                longer available in the quantity you chose.{" "}
                <Link to="/cart" className="font-medium underline">Review your cart</Link> to continue.
              </span>
            </div>
          )}

          {!isAuthenticated && (
            <SectionCard icon={Mail} title="Contact">
              <label htmlFor="checkout-email" className="block text-xs font-medium text-gray-500 mb-1">
                Email address
              </label>
              <input
                id="checkout-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="you@example.com"
                aria-invalid={!!showEmailError}
                aria-describedby={showEmailError ? "checkout-email-error" : "checkout-email-hint"}
                className={inputClass(showEmailError)}
              />
              {showEmailError ? (
                <FieldError id="checkout-email-error" message={emailError} />
              ) : (
                <p id="checkout-email-hint" className="text-xs text-gray-400 mt-1">
                  We'll send your order confirmation here.
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Have an account?{" "}
                <Link to="/login-prompt" className="text-indigo-600 hover:text-indigo-700">Log in</Link> to use saved
                addresses and track your order history.
              </p>
            </SectionCard>
          )}

          <SectionCard icon={MapPin} title="Shipping address">
            {isAuthenticated && !loadingAddresses && addresses.length > 0 && (
              <div className="mb-3">
                <label htmlFor="saved-address" className="block text-xs font-medium text-gray-500 mb-1">
                  Use a saved address
                </label>
                <select
                  id="saved-address"
                  value={selectedAddressId}
                  onChange={handleSelectAddress}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {addresses.map((a) => (
                    <option key={a.addressId} value={a.addressId}>
                      {a.label}{a.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                  <option value="">+ Type a new address</option>
                </select>
                {selectedAddress && (
                  <p className="text-xs text-gray-400 mt-1.5">Shipping to your "{selectedAddress.label}" address.</p>
                )}
              </div>
            )}

            <label htmlFor="shipping-address" className="block text-xs font-medium text-gray-500 mb-1">
              Full address
            </label>
            <textarea
              id="shipping-address"
              ref={addressRef}
              value={shippingAddress}
              onChange={(e) => {
                setShippingAddress(e.target.value);
                setSelectedAddressId("");
              }}
              onBlur={() => setTouched((t) => ({ ...t, address: true }))}
              rows={4}
              autoComplete="street-address"
              placeholder="Street address, city, postal code..."
              aria-invalid={!!showAddressError}
              aria-describedby={showAddressError ? "shipping-address-error" : undefined}
              className={inputClass(showAddressError)}
            />
            <FieldError id="shipping-address-error" message={showAddressError ? addressError : ""} />

            {isAuthenticated && (
              <Link
                to="/profile?tab=addresses"
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 w-fit mt-3"
              >
                <Plus size={13} /> Manage saved addresses
              </Link>
            )}
          </SectionCard>

          <div className="flex items-start gap-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl px-5 py-4">
            <Lock size={16} className="text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-900 leading-relaxed">
              <span className="font-medium">Next: secure payment.</span> You'll be taken to Stripe to enter your card
              details. We never see or store your card number, and your order is only placed once payment succeeds.
            </p>
          </div>
        </div>

        {/* ---------------- Right: summary ---------------- */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Order summary</h2>
            <Link to="/cart" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Edit cart</Link>
          </div>

          <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <li key={item.cartItemId} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 shrink-0">
                  <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag size={18} className="text-gray-300" />
                    )}
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gray-700 text-white text-[11px] font-medium flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{item.productName}</p>
                  <p className="text-xs text-gray-400">{money(item.unitPrice)} each</p>
                </div>
                <p className="text-sm font-medium text-gray-900 shrink-0">{money(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 text-sm pt-4 border-t border-gray-100">
            <div className="flex justify-between">
              <dt className="text-gray-500">Items ({itemCount})</dt>
              <dd className="text-gray-900">{money(cart.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shipping</dt>
              <dd className="text-gray-500">Per shipping policy</dd>
            </div>
          </dl>

          <div className="flex justify-between items-baseline pt-4 mt-4 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-900">Total</span>
            <span className="text-xl font-semibold text-gray-900">{money(cart.totalAmount)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting || blocked}
            className="w-full mt-5 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-medium rounded-lg py-3 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Redirecting to payment...</>
            ) : (
              <><Lock size={14} /> Continue to payment — {money(cart.totalAmount)}</>
            )}
          </button>

          <div className="mt-5 space-y-2 text-xs text-gray-500">
            <p className="flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-600 shrink-0" /> Payments handled securely by Stripe</p>
            <p className="flex items-center gap-2"><Truck size={14} className="text-indigo-600 shrink-0" /> Typically 5–7 business days</p>
            <p className="flex items-center gap-2"><RotateCcw size={14} className="text-indigo-600 shrink-0" /> 14-day return window</p>
          </div>
        </div>
      </form>
    </div>
  );
}