import axiosClient from "./axiosClient";

export const getSimilarProducts = (productId, limit = 10) =>
  axiosClient.get(`/products/${productId}/similar`, { params: { limit } });