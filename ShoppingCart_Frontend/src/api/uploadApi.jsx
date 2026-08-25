import axiosClient from "./axiosClient";

export const uploadProductImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return axiosClient.post("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};