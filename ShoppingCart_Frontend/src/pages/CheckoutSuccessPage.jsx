import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { confirmPayment } from "../api/paymentApi";
import { useCart } from "../context/CartContext";

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session.");
      return;
    }

    confirmPayment(sessionId)
      .then(async (res) => {
        await refreshCart();
        setOrderId(res.data.orderId);
        setConfirmed(true);
        // Brief, visible pause before moving on — long enough to register, not to feel slow
        setTimeout(() => {
          navigate(`/orders/${res.data.orderId}`, { state: { justPlaced: true }, replace: true });
        }, 1500);
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

  if (confirmed) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md mx-auto">
        <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
        <p className="text-sm font-medium text-gray-900 mb-1">Payment successful</p>
        <p className="text-sm text-gray-500">Redirecting to your order...</p>
      </div>
    );
  }

  return <p className="text-sm text-gray-500">Confirming your payment...</p>;
}