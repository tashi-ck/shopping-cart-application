import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { checkoutCart } from "../api/orderApi";
import { createCheckoutSession } from "../api/paymentApi";

export default function CheckoutPage() {
  const { cart, isLoading, refreshCart } = useCart();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await createCheckoutSession(shippingAddress);
      window.location.href = res.data.url; // full redirect to Stripe's hosted page
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
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <MapPin size={15} /> Shipping address
          </h2>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            required
            rows={4}
            placeholder="Street address, city, postal code..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

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