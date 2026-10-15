import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Minus, Plus, Trash2, ShoppingBag, Check, Undo2, AlertTriangle, ShieldCheck,
  Truck, ArrowLeft, Loader2, Info,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import SimilarProducts from "../components/SimilarProducts";

const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;
const UNDO_WINDOW_MS = 6000;

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

function CartItemRow({ item, onUpdateQuantity, onRemove }) {
  const [updating, setUpdating] = useState(false);
  const [localError, setLocalError] = useState("");

  const outOfStock = item.stockQuantity === 0;
  const overStock = item.quantity > item.stockQuantity;

  const changeQuantity = async (newQuantity) => {
    if (newQuantity < 1) return;
    setLocalError("");
    setUpdating(true);
    const result = await onUpdateQuantity(item.cartItemId, newQuantity);
    setUpdating(false);
    if (!result.success) setLocalError(result.message);
  };

  return (
    <div className="flex items-start gap-4 py-5 border-b border-gray-100 last:border-0">
      <Link
        to={`/products/${item.productId}`}
        className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-200"
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag size={22} />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/products/${item.productId}`}
              className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition line-clamp-2"
            >
              {item.productName}
            </Link>
            <p className="text-sm text-gray-500 mt-0.5">{money(item.unitPrice)} each</p>
          </div>
          <p className="text-sm font-semibold text-gray-900 shrink-0">{money(item.lineTotal)}</p>
        </div>

        {outOfStock ? (
          <p className="flex items-center gap-1 text-xs font-medium text-red-600 mt-1.5">
            <AlertTriangle size={12} /> This item is now out of stock — remove it to continue.
          </p>
        ) : overStock ? (
          <p className="flex items-center gap-1 text-xs font-medium text-amber-600 mt-1.5">
            <AlertTriangle size={12} /> Only {item.stockQuantity} available — lower the quantity to continue.
          </p>
        ) : item.stockQuantity < 5 ? (
          <p className="text-xs font-medium text-amber-600 mt-1.5">Only {item.stockQuantity} left in stock</p>
        ) : null}

        {localError && <p className="text-xs text-red-600 mt-1.5">{localError}</p>}

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity - 1)}
              disabled={updating || item.quantity <= 1}
              className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-40"
              aria-label={`Decrease quantity of ${item.productName}`}
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-sm font-medium" aria-live="polite">
              {updating ? <Loader2 size={12} className="animate-spin inline text-gray-400" /> : item.quantity}
            </span>
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity + 1)}
              disabled={updating || item.quantity >= item.stockQuantity}
              className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-40"
              aria-label={`Increase quantity of ${item.productName}`}
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition"
          >
            <Trash2 size={13} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ cart, itemCount, blocked, isAuthenticated, onCheckout }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Order summary</h2>

      <dl className="space-y-2.5 text-sm">
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
        <span className="text-sm font-medium text-gray-900">Subtotal</span>
        <span className="text-xl font-semibold text-gray-900">{money(cart.totalAmount)}</span>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={blocked}
        className="w-full mt-5 bg-indigo-600 text-white text-sm font-medium rounded-lg py-3 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Proceed to checkout
      </button>
      {blocked && (
        <p className="text-xs text-amber-600 mt-2 text-center">Fix the highlighted items to continue.</p>
      )}

      <div className="mt-5 space-y-2 text-xs text-gray-500">
        <p className="flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-600 shrink-0" /> Secure payment by Stripe</p>
        <p className="flex items-center gap-2"><Truck size={14} className="text-indigo-600 shrink-0" /> Typically 5–7 business days</p>
      </div>

      {!isAuthenticated && (
        <p className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 mt-4">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            You can check out as a guest, or <Link to="/login-prompt" className="text-indigo-600 hover:text-indigo-700">log in</Link> to
            save addresses and track orders.
          </span>
        </p>
      )}
    </div>
  );
}

export default function CartPage() {
  const { cart, itemCount, isLoading, error, updateQuantity, removeItem, addItem } = useCart();
  const { isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const [undo, setUndo] = useState(null); // { item }
  const [restoring, setRestoring] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionError, setActionError] = useState("");
  const undoTimer = useRef(null);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const handleRemove = async (item) => {
    setActionError("");
    try {
      await removeItem(item.cartItemId);
      // Only the most recent removal is undoable.
      clearTimeout(undoTimer.current);
      setUndo({ item });
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
    } catch {
      setActionError(`Couldn't remove "${item.productName}". Please try again.`);
    }
  };

  const handleUndo = async () => {
    if (!undo || restoring) return;
    const { item } = undo;
    clearTimeout(undoTimer.current);
    setRestoring(true);

    // Rebuild the product shape CartContext.addItem expects (guest path needs the snapshot fields).
    const result = await addItem(
      {
        productId: item.productId,
        name: item.productName,
        imageUrl: item.imageUrl,
        price: item.unitPrice,
        stockQuantity: item.stockQuantity,
      },
      item.quantity
    );

    setRestoring(false);
    setUndo(null);
    if (!result.success) setActionError(result.message || "Couldn't restore that item.");
  };

  const handleClearCart = async () => {
    if (!cart) return;
    setClearing(true);
    setActionError("");
    try {
      // Snapshot first: removing mutates the cart the loop would otherwise iterate.
      for (const item of [...cart.items]) {
        await removeItem(item.cartItemId);
      }
      setUndo(null);
    } catch {
      setActionError("Couldn't clear your cart. Please try again.");
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  };

  if (isLoading || cart === null) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-40 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && cart.items.length === 0) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const undoToast = undo && (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg max-w-[90vw]">
      <span className="truncate">Removed "{undo.item.productName}"</span>
      <button
        type="button"
        onClick={handleUndo}
        disabled={restoring}
        className="flex items-center gap-1 font-medium text-indigo-300 hover:text-white shrink-0 disabled:opacity-50"
      >
        {restoring ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />} Undo
      </button>
    </div>
  );

  if (cart.items.length === 0) {
    return (
      <>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto">
          <ShoppingBag className="mx-auto text-gray-300 mb-3" size={36} />
          <p className="text-sm font-medium text-gray-700">Your cart is empty</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Add something you like and it will show up here.</p>
          <Link
            to="/"
            className="inline-block text-sm font-medium bg-indigo-600 text-white rounded-lg px-5 py-2.5 hover:bg-indigo-700 transition"
          >
            Browse products
          </Link>
        </div>
        {undoToast}
      </>
    );
  }

  // Checkout would fail server-side on these, so block it here with a clear reason.
  const blocked = cart.items.some((i) => i.stockQuantity === 0 || i.quantity > i.stockQuantity);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Your Cart</h1>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft size={14} /> Continue shopping
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
      </p>

      <Steps current={0} />

      {actionError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {actionError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 px-6">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.cartItemId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <div className="flex justify-end">
            {confirmingClear ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">Remove all items?</span>
                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={clearing}
                  className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                >
                  {clearing ? "Clearing..." : "Yes, clear cart"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  disabled={clearing}
                  className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="text-xs text-gray-400 hover:text-red-600 transition"
              >
                Clear cart
              </button>
            )}
          </div>
        </div>

        <SummaryCard
          cart={cart}
          itemCount={itemCount}
          blocked={blocked}
          isAuthenticated={isAuthenticated}
          onCheckout={() => navigate("/checkout")}
        />
      </div>

      {/* Recommendations seeded from the first item in the cart */}
      <SimilarProducts productId={cart.items[0].productId} limit={5} />

      {undoToast}
    </div>
  );
}