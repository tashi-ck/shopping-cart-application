import axiosClient from "./axiosClient";

export const getCategories = () => axiosClient.get("/categories");
export const createCategory = (data) => axiosClient.post("/categories", data);
export const updateCategory = (id, data) => axiosClient.put(`/categories/${id}`, data);
export const deleteCategory = (id) => axiosClient.delete(`/categories/${id}`);