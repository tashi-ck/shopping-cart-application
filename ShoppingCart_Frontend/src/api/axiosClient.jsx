import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && typeof error.response.data === "string" && error.response.data.includes("deactivated")) {
      window.dispatchEvent(new CustomEvent("account:deactivated", { detail: error.response.data }));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;