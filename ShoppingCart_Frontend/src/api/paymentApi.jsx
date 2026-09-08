import axiosClient from "./axiosClient";

export const createCheckoutSession = (shippingAddress) =>
  axiosClient.post("/payments/create-checkout-session", { shippingAddress });

export const createBuyNowCheckoutSession = (productId, quantity, shippingAddress) =>
  axiosClient.post("/payments/create-buynow-checkout-session", { productId, quantity, shippingAddress });

export const confirmPayment = (sessionId) =>
  axiosClient.get(`/payments/confirm/${sessionId}`);

export const createGuestCheckoutSession = (email, shippingAddress, items, cancelPath) =>
  axiosClient.post("/payments/guest-checkout-session", { email, shippingAddress, items, cancelPath });

export const guestConfirmPayment = (sessionId) =>
  axiosClient.get(`/payments/guest-confirm/${sessionId}`);