import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { MapPin, Mail, ShoppingBag, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { createCheckoutSession, createGuestCheckoutSession } from "../api/paymentApi";
import { getAddresses } from "../api/addressApi";

export default function CheckoutPage() {
  const { isAuthenticated } = useAuth0();
  const { cart, isLoading, refreshCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isAuthenticated) {
        const res = await createCheckoutSession(shippingAddress);
        window.location.href = res.data.url;
      } else {
        const items = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        const res = await createGuestCheckoutSession(guestEmail, shippingAddress, items);
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err.response?.data ?? "Couldn't start checkout. Please try again.");
      setSubmitting(false);
    }
  };

  if (isLoading || cart === null) {
    return <p className="text-sm text-gray-500">Loading checkout...</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <ShoppingBag className="mx-auto text-gray-300 mb-3" size={32} />
        <p className="text-sm text-gray-500 mb-4">Your cart is empty — nothing to check out.</p>
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Checkout</h1>

      <div className="grid md:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-3 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {!isAuthenticated && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <Mail size={15} /> Your email
              </h2>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">We'll send your order confirmation here.</p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <MapPin size={15} /> Shipping address
            </h2>

            {isAuthenticated && !loadingAddresses && addresses.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Use a saved address</label>
                <select
                  value={selectedAddressId}
                  onChange={handleSelectAddress}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {addresses.map((a) => (
                    <option key={a.addressId} value={a.addressId}>
                      {a.label} — {a.fullAddress.length > 50 ? a.fullAddress.slice(0, 50) + "..." : a.fullAddress}
                    </option>
                  ))}
                  <option value="">+ Type a new address</option>
                </select>
              </div>
            )}

            <textarea
              value={shippingAddress}
              onChange={(e) => {
                setShippingAddress(e.target.value);
                setSelectedAddressId("");
              }}
              required
              rows={4}
              placeholder="Street address, city, postal code..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {isAuthenticated && (
            <Link to="/profile" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 w-fit">
              <Plus size={13} /> Manage saved addresses
            </Link>
          )}

          {!isAuthenticated && (
            <p className="text-xs text-gray-400">
              Have an account? <Link to="/login-prompt" className="text-indigo-600 hover:text-indigo-700">Log in</Link> to use saved addresses and track your order history.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white text-sm font-medium rounded-lg py-3 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? "Placing order..." : `Place order — $${cart.totalAmount.toFixed(2)}`}
          </button>
        </form>

        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 h-fit">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Order summary</h2>
          <div className="space-y-3 mb-4">
            {cart.items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                <span className="text-gray-900 font-medium">${item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold pt-3 border-t border-gray-100">
            <span>Total</span>
            <span>${cart.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}