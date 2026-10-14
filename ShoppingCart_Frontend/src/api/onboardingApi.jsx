import axiosClient from "./axiosClient";

export const submitOnboarding = (data) => axiosClient.post("/users/onboarding", data);

export const getPreferences = () => axiosClient.get("/users/me/preferences");
export const updatePreferences = (data) => axiosClient.put("/users/me/preferences", data);