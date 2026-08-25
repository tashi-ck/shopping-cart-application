import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { CheckCircle2, ArrowLeft, MapPin, XCircle } from "lucide-react";
import { getOrder, cancelOrder } from "../api/orderApi";

const statusStyles = {
  Pending: "bg-gray-100 text-gray-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Shipped: "bg-amber-100 text-amber-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = location.state?.justPlaced;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    setLoading(true);
    getOrder(id)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Order not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const res = await cancelOrder(id);
      setOrder(res.data);
      setConfirmingCancel(false);
    } catch (err) {
      setCancelError(err.response?.data ?? "Couldn't cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading order...</p>;

  if (error || !order) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500 mb-3">{error}</p>
        <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to orders
        </Link>
      </div>
    );
  }

  const canCancel = order.status === "Pending";

  return (
    <div className="max-w-2xl">
      <Link to="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6 w-fit">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      {justPlaced && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6">
          <CheckCircle2 size={16} /> Your order has been placed successfully.
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-gray-900">Order #{order.orderId}</h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[order.status] ?? "bg-gray-100 text-gray-700"}`}>
          {order.status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Placed {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">${item.lineTotal.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-semibold pt-4 mt-4 border-t border-gray-100">
          <span>Total</span>
          <span>${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <MapPin size={15} /> Shipping address
        </h2>
        <p className="text-sm text-gray-600 whitespace-pre-line">{order.shippingAddress}</p>
      </div>

      {canCancel && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {cancelError && (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {cancelError}
            </div>
          )}

          {confirmingCancel ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Cancel this order? Stock will be restored.</span>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, cancel order"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                Never mind
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition"
            >
              <XCircle size={16} /> Cancel this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}