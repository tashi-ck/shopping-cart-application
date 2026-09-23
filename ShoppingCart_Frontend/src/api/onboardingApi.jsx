import axiosClient from "./axiosClient";

export const submitOnboarding = (data) => axiosClient.post("/users/onboarding", data);