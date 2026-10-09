import axiosClient from "./axiosClient";

export const getDashboard = () => axiosClient.get("/admin/dashboard");