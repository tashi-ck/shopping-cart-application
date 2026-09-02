import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllOrdersForAdmin, updateOrderFulfillmentStatus} from "../../api/orderApi";
import InlineStatusBadge from "../../components/admin/InlineStatusBadge";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";

export default function AdminOrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const load = () => {
    setLoading(true);
    getAllOrdersForAdmin()
      .then((res) => setOrders(res.data))
      .catch(() => setError("Couldn't load orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    const previousOrders = orders;

    setUpdatingId(orderId);
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, fulfillmentStatus: newStatus } : o))
    );

    try {
      await updateOrderFulfillmentStatus(orderId, newStatus);
    } catch (err) {
      setOrders(previousOrders);
    } finally {
      setUpdatingId(null);
    }
  };

  const customerName = (order) => {
    const name = [order.userFirstName, order.userLastName].filter(Boolean).join(" ");
    return name || order.userEmail;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">All customer orders, across every account.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading orders...</p>
        ) : error ? (
          <p className="text-sm text-red-600 p-6">{error}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
  <tr>
    <th className="text-left p-3">Order</th>
    <th className="text-left p-3">Customer</th>
    <th className="text-left p-3">Date</th>
    <th className="text-left p-3">Total</th>
    <th className="text-left p-3">Payment</th>
    <th className="text-left p-3">Fulfillment</th>
  </tr>
</thead>
<tbody>
  {orders.map((order) => (
    <tr
      key={order.orderId}
      onClick={() => navigate(`/admin/orders/${order.orderId}`)}
      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition"
    >
      <td className="p-3 font-medium text-gray-900">#{order.orderId}</td>
      <td className="p-3">
        <p className="text-gray-900">{customerName(order)}</p>
        <p className="text-xs text-gray-400">{order.userEmail}</p>
      </td>
      <td className="p-3 text-gray-500">
        {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
      </td>
      <td className="p-3 text-gray-900 font-medium">${order.totalAmount.toFixed(2)}</td>
      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        <PaymentStatusBadge status={order.paymentStatus} />
      </td>
      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        <InlineStatusBadge
          value={order.fulfillmentStatus}
          disabled={updatingId === order.orderId}
          onChange={(newStatus) => handleStatusChange(order.orderId, newStatus)}
        />
      </td>
    </tr>
  ))}
</tbody>
          </table>
        )}
      </div>
    </div>
  );
}