import axiosClient from "./axiosClient";

export const getCart = () => axiosClient.get("/cart");
export const addCartItem = (data) => axiosClient.post("/cart/items", data);
export const updateCartItemQuantity = (cartItemId, quantity) =>
  axiosClient.put(`/cart/items/${cartItemId}`, { quantity });
export const removeCartItem = (cartItemId) => axiosClient.delete(`/cart/items/${cartItemId}`);