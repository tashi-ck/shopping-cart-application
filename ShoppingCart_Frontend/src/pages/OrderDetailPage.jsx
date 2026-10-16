import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import {
  CheckCircle2, ArrowLeft, MapPin, XCircle, Package, Truck, PackageCheck, ClipboardCheck,
  ChevronDown, CreditCard, RotateCw, Check, Loader2, Star, ShieldCheck, HelpCircle, ShoppingBag,
} from "lucide-react";
import { getOrder, cancelOrder, getReviewableItems } from "../api/orderApi";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import { fulfillmentStatusStyles } from "../utils/statusStyles";

const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const TIMELINE = [
  { key: "Confirmed", label: "Confirmed", icon: ClipboardCheck, hint: "We've received your order" },
  { key: "Shipped", label: "Shipped", icon: Truck, hint: "On its way to you" },
  { key: "Delivered", label: "Delivered", icon: PackageCheck, hint: "Arrived at your address" },
];

function TrackingTimeline({ status, createdAt }) {
  const currentIndex = TIMELINE.findIndex((s) => s.key === status);

  return (
    <ol className="flex items-start" aria-label="Order progress">
      {TIMELINE.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const reached = done || active;
        const Icon = step.icon;

        return (
          <li key={step.key} className="flex-1 relative flex flex-col items-center text-center">
            {/* connector to the previous step */}
            {i > 0 && (
              <span
                className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${
                  i <= currentIndex ? "bg-indigo-600" : "bg-gray-200"
                }`}
              />
            )}

            <span
              className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition ${
                done
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : active
                  ? "bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-100"
                  : "bg-white border-gray-200 text-gray-300"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check size={16} /> : <Icon size={16} />}
            </span>

            <p className={`mt-2 text-xs font-medium ${reached ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 px-1">
              {i === 0
                ? new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : active
                ? step.hint
                : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function CollapsibleSection({ icon: Icon, title, summary, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon size={15} className="text-indigo-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {!open && summary && <span className="text-xs text-gray-400 truncate hidden sm:inline">· {summary}</span>}
        </span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-5 text-sm">{children}</div>}
    </div>
  );
}

// "Buy again" re-adds an item at TODAY's price/stock, so it fetches the live product first.
function OrderItemRow({ item }) {
  const { addItem } = useCart();
  const [state, setState] = useState("idle"); // idle | adding | added
  const [message, setMessage] = useState("");

  const handleBuyAgain = async () => {
    setState("adding");
    setMessage("");
    try {
      const res = await axiosClient.get(`/products/${item.productId}`);
      const product = res.data;

      if (!product || product.isActive === false) {
        setState("idle");
        return setMessage("No longer available.");
      }
      if (product.stockQuantity === 0) {
        setState("idle");
        return setMessage("Out of stock right now.");
      }

      const quantity = Math.min(item.quantity, product.stockQuantity);
      const result = await addItem(product, quantity);

      if (result.success) {
        setState("added");
        if (quantity < item.quantity) setMessage(`Added ${quantity} — only that many in stock.`);
        setTimeout(() => setState("idle"), 2200);
      } else {
        setState("idle");
        setMessage(result.message || "Couldn't add to cart.");
      }
    } catch (err) {
      setState("idle");
      setMessage(err?.response?.status === 404 ? "No longer available." : "Couldn't add to cart.");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Link
        to={`/products/${item.productId}`}
        className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center"
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag size={18} className="text-gray-300" />
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/products/${item.productId}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition line-clamp-2">
          {item.productName}
        </Link>
        <p className="text-xs text-gray-500">{money(item.unitPrice)} × {item.quantity}</p>
        {message && <p className="text-xs text-amber-600 mt-0.5">{message}</p>}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="text-sm font-semibold text-gray-900">{money(item.lineTotal)}</p>
        <button
          type="button"
          onClick={handleBuyAgain}
          disabled={state === "adding"}
          className={`flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5 border transition disabled:opacity-60 ${
            state === "added"
              ? "bg-green-50 border-green-200 text-green-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {state === "adding" ? <Loader2 size={12} className="animate-spin" /> : state === "added" ? <Check size={12} /> : <RotateCw size={12} />}
          {state === "added" ? "Added" : "Buy again"}
        </button>
      </div>
    </div>
  );
}

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

  const [reviewableItems, setReviewableItems] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError("");
    getOrder(id)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Order not found."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (order?.fulfillmentStatus === "Delivered") {
      getReviewableItems(id)
        .then((res) => setReviewableItems(res.data))
        .catch(() => {});
    }
  }, [order?.fulfillmentStatus, id]);

  const handleCancel = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const res = await cancelOrder(id);
      setOrder(res.data);
      setConfirmingCancel(false);
    } catch (err) {
      setCancelError(
        typeof err?.response?.data === "string" && err.response.data ? err.response.data : "Couldn't cancel this order."
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse space-y-4">
        <div className="h-4 bg-gray-100 rounded w-28" />
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-56 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl">
        <Package className="mx-auto text-gray-300 mb-3" size={34} />
        <p className="text-sm text-gray-500 mb-3">{error || "Order not found."}</p>
        <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to orders
        </Link>
      </div>
    );
  }

  const cancelled = order.fulfillmentStatus === "Cancelled";
  const refunded = order.paymentStatus === "Refunded";
  const canCancel = order.fulfillmentStatus === "Confirmed";
  const placedOn = new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition w-fit">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      {justPlaced && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 size={16} /> Your order has been placed successfully. A confirmation email is on its way.
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Order #{order.orderId}</h1>
          <p className="text-sm text-gray-400 mt-1">Placed {placedOn} · {itemCount} {itemCount === 1 ? "item" : "items"}</p>
        </div>
        <div className="flex gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${fulfillmentStatusStyles[order.fulfillmentStatus] ?? "bg-gray-100 text-gray-700"}`}>
            {order.fulfillmentStatus}
          </span>
        </div>
      </div>

      {/* Tracking */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {cancelled ? (
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600 shrink-0">
              <XCircle size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">This order was cancelled</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {refunded
                  ? "Your payment has been refunded to the original payment method. It can take 5–10 business days to appear."
                  : "Stock has been released. If you were charged, a refund will be issued to your original payment method."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-gray-900 mb-5">Order progress</h2>
            <TrackingTimeline status={order.fulfillmentStatus} createdAt={order.createdAt} />
          </>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <OrderItemRow key={item.orderItemId} item={item} />
          ))}
        </div>
        <div className="flex justify-between items-baseline text-sm font-semibold pt-4 mt-4 border-t border-gray-100">
          <span>Total</span>
          <span className="text-lg">{money(order.totalAmount)}</span>
        </div>
      </div>

      {/* Reviews */}
      {order.fulfillmentStatus === "Delivered" && reviewableItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Review your purchase</h2>
          <div className="space-y-3">
            {reviewableItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag size={16} className="text-gray-300" />
                  )}
                </div>
                <p className="flex-1 text-sm text-gray-900">{item.productName}</p>
                {item.alreadyReviewed ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                    <ShieldCheck size={13} /> Reviewed
                  </span>
                ) : item.canReview ? (
                  <Link
                    to={`/products/${item.productId}#reviews`}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5"
                  >
                    <Star size={13} /> Write a review
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible details */}
      <CollapsibleSection
        icon={MapPin}
        title="Shipping address"
        summary={order.shippingAddress.split("\n")[0]}
        defaultOpen
      >
        <p className="text-gray-600 whitespace-pre-line">{order.shippingAddress}</p>
      </CollapsibleSection>

      <CollapsibleSection
        icon={CreditCard}
        title="Payment"
        summary={`${order.paymentStatus} · ${money(order.totalAmount)}`}
      >
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Status</dt>
            <dd><PaymentStatusBadge status={order.paymentStatus} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">{refunded ? "Amount refunded" : "Amount charged"}</dt>
            <dd className="font-medium text-gray-900">{money(order.totalAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Method</dt>
            <dd className="text-gray-700">Card via Stripe</dd>
          </div>
        </dl>
        {refunded && (
          <p className="text-xs text-gray-400 mt-3">Refunds typically appear within 5–10 business days.</p>
        )}
      </CollapsibleSection>

      {/* Cancel */}
      {canCancel && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {cancelError && (
            <div role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {cancelError}
            </div>
          )}

          {confirmingCancel ? (
            <div>
              <p className="text-sm text-gray-700 mb-3">
                Cancel this order? Items go back into stock and your payment will be refunded.
              </p>
              <div className="flex gap-2">
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
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">You can cancel until the order ships.</p>
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition shrink-0"
              >
                <XCircle size={16} /> Cancel this order
              </button>
            </div>
          )}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-2">
        <HelpCircle size={13} /> Need help with this order?{" "}
        <Link to="/policies" className="text-indigo-600 hover:text-indigo-700">Read our policies</Link> or ask the chat
        assistant.
      </p>
    </div>
  );
}