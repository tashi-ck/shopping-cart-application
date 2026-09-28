import axiosClient from "./axiosClient";

export const sendChatMessage = (message, history) =>
  axiosClient.post("/chat", { message, history });