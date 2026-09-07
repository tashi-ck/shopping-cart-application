import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getCart, addCartItem, updateCartItemQuantity, removeCartItem } from "../api/cartApi";
import { getGuestCart, addGuestCartItem, updateGuestCartItemQuantity, removeGuestCartItem, clearGuestCart } from "../utils/guestCart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth0();
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshCart = useCallback(async () => {
    if (isAuthenticated) {
      setIsLoading(true);
      try {
        const res = await getCart();
        setCart(res.data);
      } catch {
        setError("Couldn't load your cart.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setCart(getGuestCart()); // synchronous — nothing to load
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // `product` here is a full product object (productId, name, imageUrl, price, stockQuantity) —
  // the server path only needs productId, but the guest path needs the rest to build a
  // local snapshot, so every call site passes the whole product.
  const addItem = async (product, quantity) => {
    setError("");
    if (isAuthenticated) {
      try {
        const res = await addCartItem({ productId: product.productId, quantity });
        setCart(res.data);
        return { success: true };
      } catch (err) {
        const message = err.response?.data ?? "Couldn't add item to cart.";
        setError(message);
        return { success: false, message };
      }
    } else {
      const updated = addGuestCartItem(product, quantity);
      setCart(updated);
      return { success: true };
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    setError("");
    if (isAuthenticated) {
      try {
        const res = await updateCartItemQuantity(cartItemId, quantity);
        setCart(res.data);
        return { success: true };
      } catch (err) {
        const message = err.response?.data ?? "Couldn't update quantity.";
        setError(message);
        return { success: false, message };
      }
    } else {
      const updated = updateGuestCartItemQuantity(cartItemId, quantity); // cartItemId IS productId for guests
      setCart(updated);
      return { success: true };
    }
  };

  const removeItem = async (cartItemId) => {
    setError("");
    if (isAuthenticated) {
      const res = await removeCartItem(cartItemId);
      setCart(res.data);
    } else {
      const updated = removeGuestCartItem(cartItemId);
      setCart(updated);
    }
  };

  // Called after a successful guest checkout confirmation — clears local storage
  // and syncs context state, same role as the server clearing CartItems post-checkout.
  const clearCart = () => {
    if (!isAuthenticated) {
      const updated = clearGuestCart();
      setCart(updated);
    }
  };

  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{ cart, itemCount, isLoading, error, addItem, updateQuantity, removeItem, refreshCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);