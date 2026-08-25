import axiosClient from "./axiosClient";

export const checkoutCart = (shippingAddress) =>
  axiosClient.post("/orders/checkout", { shippingAddress });

export const buyNow = (productId, quantity, shippingAddress) =>
  axiosClient.post("/orders/buy-now", { productId, quantity, shippingAddress });

export const getOrders = () => axiosClient.get("/orders");
export const getOrder = (orderId) => axiosClient.get(`/orders/${orderId}`);

export const getAllOrdersForAdmin = () => axiosClient.get("/orders/admin");
export const updateOrderStatus = (orderId, status) =>
  axiosClient.put(`/orders/admin/${orderId}/status`, { status });

export const cancelOrder = (orderId) => axiosClient.post(`/orders/${orderId}/cancel`);

export const getOrderForAdmin = (orderId) => axiosClient.get(`/orders/admin/${orderId}`);

export const deleteOrder = (orderId) => axiosClient.delete(`/orders/admin/${orderId}`);