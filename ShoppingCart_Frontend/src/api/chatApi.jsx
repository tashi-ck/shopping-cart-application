import axiosClient from "./axiosClient";

export const sendChatMessage = (message, history) =>
  axiosClient.post("/chat", { message, history });

export const getChatLogsForAdmin = (limit = 50) =>
  axiosClient.get("/chat/admin/logs", { params: { limit } });

export const testChatMessage = (message, history, policyIds, categoryIds) =>
  axiosClient.post("/chat/admin/test", { message, history, policyIds, categoryIds });

export const submitChatFeedback = (chatLogId, helpful) =>
  axiosClient.post(`/chat/${chatLogId}/feedback`, { helpful });