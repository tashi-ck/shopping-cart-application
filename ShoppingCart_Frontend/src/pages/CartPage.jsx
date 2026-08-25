import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";

function CartItemRow({ item, onUpdateQuantity, onRemove }) {
  const [updating, setUpdating] = useState(false);
  const [localError, setLocalError] = useState("");

  const changeQuantity = async (newQuantity) => {
    if (newQuantity < 1) return;
    setLocalError("");
    setUpdating(true);
    const result = await onUpdateQuantity(item.cartItemId, newQuantity);
    setUpdating(false);
    if (!result.success) setLocalError(result.message);
  };

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-200">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{item.productName}</p>
        <p className="text-sm text-gray-500 mt-0.5">${item.unitPrice.toFixed(2)} each</p>
        {localError && <p className="text-xs text-red-600 mt-1">{localError}</p>}

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity - 1)}
              disabled={updating || item.quantity <= 1}
              className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-40"
            >
              <Minus size={13} />
            </button>
            <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity + 1)}
              disabled={updating || item.quantity >= item.stockQuantity}
              className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-40"
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.cartItemId)}
            className="text-gray-400 hover:text-red-600 transition"
            title="Remove item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-gray-900 shrink-0">${item.lineTotal.toFixed(2)}</p>
    </div>
  );
}

export default function CartPage() {
  const { cart, isLoading, error, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  if (isLoading || cart === null) {
    return <p className="text-sm text-gray-500">Loading your cart...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <ShoppingBag className="mx-auto text-gray-300 mb-3" size={32} />
        <p className="text-sm text-gray-500 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Cart</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        {cart.items.map((item) => (
          <CartItemRow
            key={item.cartItemId}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-xl font-semibold text-gray-900">${cart.totalAmount.toFixed(2)}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/checkout")}
          className="w-full bg-indigo-600 text-white text-sm font-medium rounded-lg py-3 hover:bg-indigo-700 transition"
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}