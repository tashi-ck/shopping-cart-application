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

export const addProductImage = (productId, imageUrl) =>
  axiosClient.post(`/products/${productId}/images`, { imageUrl });

export const deleteProductImage = (productId, imageId) =>
  axiosClient.delete(`/products/${productId}/images/${imageId}`);

export const reorderProductImages = (productId, productImageIds) =>
  axiosClient.put(`/products/${productId}/images/reorder`, { productImageIds });

export const getProduct = (id) => axiosClient.get(`/products/${id}`);

export const getPersonalizedProducts = (limit = 12) =>
  axiosClient.get("/products/for-you", { params: { limit } });

export const getProductsPaged = (filters = {}) => {
  const params = { page: filters.page ?? 1, pageSize: filters.pageSize ?? 12 };
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.search) params.search = filters.search;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.minPrice !== undefined && filters.minPrice !== "") params.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined && filters.maxPrice !== "") params.maxPrice = filters.maxPrice;
  if (filters.inStockOnly) params.inStockOnly = true;
  return axiosClient.get("/products/search", { params });
};