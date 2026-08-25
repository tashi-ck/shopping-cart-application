import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, User, CreditCard, Trash2 } from "lucide-react";
import { getOrderForAdmin, updateOrderStatus, deleteOrder } from "../../api/orderApi";
import InlineStatusBadge from "../../components/admin/InlineStatusBadge";

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setLoading(true);
    getOrderForAdmin(id)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Order not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const previousStatus = order.status;
    setUpdating(true);
    setOrder((prev) => ({ ...prev, status: newStatus }));

    try {
      await updateOrderStatus(id, newStatus);
    } catch {
      setOrder((prev) => ({ ...prev, status: previousStatus }));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteOrder(id);
      navigate("/admin/orders");
    } catch (err) {
      setDeleteError(err.response?.data ?? "Couldn't delete this order.");
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading order...</p>;

  if (error || !order) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500 mb-3">{error}</p>
        <Link to="/admin/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to orders
        </Link>
      </div>
    );
  }

  const customerName = [order.userFirstName, order.userLastName].filter(Boolean).join(" ") || order.userEmail;

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/admin/orders")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6"
      >
        <ArrowLeft size={15} /> Back to orders
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-gray-900">Order #{order.orderId}</h1>
        <InlineStatusBadge value={order.status} disabled={updating} onChange={handleStatusChange} />
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Placed {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <User size={15} /> Customer
        </h2>
        <p className="text-sm text-gray-900">{customerName}</p>
        <p className="text-sm text-gray-500">{order.userEmail}</p>
      </div>

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

      {order.paymentReference && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <CreditCard size={15} /> Payment
          </h2>
          <p className="text-xs text-gray-500 font-mono">{order.paymentReference}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
        <p className="text-xs text-gray-500 mb-3">
          Permanently deletes this order record. Stock is not restored — this is different from cancelling.
        </p>

        {deleteError && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {deleteError}
          </div>
        )}

        {confirmingDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Delete this order permanently?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, delete permanently"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition"
          >
            <Trash2 size={16} /> Delete order
          </button>
        )}
      </div>
    </div>
  );
}