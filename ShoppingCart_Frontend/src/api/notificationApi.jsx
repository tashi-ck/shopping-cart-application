import axiosClient from "./axiosClient";

export const getNotifications = () => axiosClient.get("/notifications");
export const getUnreadCount = () => axiosClient.get("/notifications/unread-count");
export const markAsRead = (notificationId) => axiosClient.put(`/notifications/${notificationId}/read`);
export const markAllAsRead = () => axiosClient.put("/notifications/read-all");