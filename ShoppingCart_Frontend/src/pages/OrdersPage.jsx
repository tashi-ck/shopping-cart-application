import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, XCircle } from "lucide-react";
import { getOrders, cancelOrder } from "../api/orderApi";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import { fulfillmentStatusStyles } from "../utils/statusStyles";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingCancelId, setConfirmingCancelId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    getOrders()
      .then((res) => setOrders(res.data))
      .catch(() => setError("Couldn't load your orders."))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (orderId, e) => {
    e.preventDefault();
    e.stopPropagation();

    setCancellingId(orderId);
    try {
      const res = await cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, fulfillmentStatus: res.data.fulfillmentStatus, paymentStatus: res.data.paymentStatus }
            : o
        )
      );
    } catch {
      // silently ignored here — the detail page shows the real error message
    } finally {
      setCancellingId(null);
      setConfirmingCancelId(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading your orders...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <PackageSearch className="mx-auto text-gray-300 mb-3" size={32} />
        <p className="text-sm text-gray-500 mb-4">You haven't placed any orders yet.</p>
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Orders</h1>

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.orderId}
            to={`/orders/${order.orderId}`}
            className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Order #{order.orderId}</span>
              <div className="flex gap-1.5">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    fulfillmentStatusStyles[order.fulfillmentStatus] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.fulfillmentStatus}
                </span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-2">
              {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{order.items.length} {order.items.length === 1 ? "item" : "items"}</span>
              <span className="font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</span>
            </div>

            {order.fulfillmentStatus === "Confirmed" && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {confirmingCancelId === order.orderId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Cancel this order?</span>
                    <button
                      type="button"
                      onClick={(e) => handleCancel(order.orderId, e)}
                      disabled={cancellingId === order.orderId}
                      className="text-xs font-medium bg-red-600 text-white rounded-lg px-2.5 py-1 hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancellingId === order.orderId ? "Cancelling..." : "Yes"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmingCancelId(null);
                      }}
                      className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmingCancelId(order.orderId);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    <XCircle size={13} /> Cancel order
                  </button>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}