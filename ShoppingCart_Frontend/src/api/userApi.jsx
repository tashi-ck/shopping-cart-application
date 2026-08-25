import axiosClient from "./axiosClient";

export const getOrSyncUser = () => axiosClient.get("/users/me");

export const getProfile = () => axiosClient.get("/users/me");

export const getAllUsersForAdmin = () => axiosClient.get("/users/admin");
export const setUserActive = (userId, isActive) =>
  axiosClient.patch(`/users/admin/${userId}/active`, { isActive });
export const deleteUser = (userId) => axiosClient.delete(`/users/admin/${userId}`);