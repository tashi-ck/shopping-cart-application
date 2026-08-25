import axiosClient from "./axiosClient";

export const getProducts = (filters = {}) => {
  const params = {};
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.search) params.search = filters.search;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.includeInactive) params.includeInactive = true;
  return axiosClient.get("/products", { params });
};

export const createProduct = (data) => axiosClient.post("/products", data);
export const updateProduct = (id, data) => axiosClient.put(`/products/${id}`, data);
export const deleteProduct = (id) => axiosClient.delete(`/products/${id}`);
export const setProductActive = (id, isActive) =>
  axiosClient.patch(`/products/${id}/active`, { isActive });