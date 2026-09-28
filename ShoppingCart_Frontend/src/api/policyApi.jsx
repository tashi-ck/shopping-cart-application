import axiosClient from "./axiosClient";

export const getPolicies = () => axiosClient.get("/policies");
export const getPolicy = (slug) => axiosClient.get(`/policies/${slug}`);
export const createPolicy = (data) => axiosClient.post("/policies", data);
export const updatePolicy = (id, data) => axiosClient.put(`/policies/${id}`, data);
export const deletePolicy = (id) => axiosClient.delete(`/policies/${id}`);