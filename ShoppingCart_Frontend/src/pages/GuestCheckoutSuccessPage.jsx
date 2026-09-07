import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";
import { guestConfirmPayment } from "../api/paymentApi";
import { useCart } from "../context/CartContext";

export default function GuestCheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session.");
      return;
    }

    guestConfirmPayment(sessionId)
      .then((res) => {
        setOrder(res.data);
        clearCart(); // clears the local guest cart now that the order is confirmed
      })
      .catch((err) => {
        setError(err.response?.data ?? "Couldn't confirm your payment.");
      });
  }, [sessionId]);

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md mx-auto">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Link to="/cart" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to cart
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="text-sm text-gray-500">Confirming your payment...</p>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Order confirmed</h1>
      <p className="text-sm text-gray-500 mb-4">Order #{order.orderId} — ${order.totalAmount.toFixed(2)}</p>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3 mb-6">
        <Mail size={15} />
        A confirmation has been sent to your email.
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Since you checked out as a guest, this order isn't tied to an account — save your
        confirmation email to track it.
      </p>

      <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        Continue shopping
      </Link>
    </div>
  );
}