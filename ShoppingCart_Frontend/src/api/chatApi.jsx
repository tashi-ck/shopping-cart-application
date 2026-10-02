import axiosClient from "./axiosClient";

// Kept for any non-streaming use; the live widget uses the streaming endpoint
// directly via fetch, since axios doesn't expose a readable response stream
// the way the Fetch API does in the browser.
export const sendChatMessage = (message, history) =>
  axiosClient.post("/chat", { message, history });

export const getChatLogsForAdmin = (limit = 50) =>
  axiosClient.get("/chat/admin/logs", { params: { limit } });