import axiosClient from "./axiosClient";

export const createCheckoutSession = (shippingAddress) =>
  axiosClient.post("/payments/create-checkout-session", { shippingAddress });

export const createBuyNowCheckoutSession = (productId, quantity, shippingAddress) =>
  axiosClient.post("/payments/create-buynow-checkout-session", { productId, quantity, shippingAddress });

export const confirmPayment = (sessionId) =>
  axiosClient.get(`/payments/confirm/${sessionId}`);