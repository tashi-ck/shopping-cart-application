import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getCart, addCartItem, updateCartItemQuantity, removeCartItem } from "../api/cartApi";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth0();
  const [cart, setCart] = useState(null); // { cartId, items, totalAmount }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await getCart();
      setCart(res.data);
    } catch {
      setError("Couldn't load your cart.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load once on login, clear on logout
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (productId, quantity) => {
    setError("");
    try {
      const res = await addCartItem({ productId, quantity });
      setCart(res.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data ?? "Couldn't add item to cart.";
      setError(message);
      return { success: false, message };
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    setError("");
    try {
      const res = await updateCartItemQuantity(cartItemId, quantity);
      setCart(res.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data ?? "Couldn't update quantity.";
      setError(message);
      return { success: false, message };
    }
  };

  const removeItem = async (cartItemId) => {
    setError("");
    const res = await removeCartItem(cartItemId);
    setCart(res.data);
  };

  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, itemCount, isLoading, error, addItem, updateQuantity, removeItem, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);