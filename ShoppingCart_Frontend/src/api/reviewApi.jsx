import axiosClient from "./axiosClient";

export const getReviews = (productId) => axiosClient.get(`/products/${productId}/reviews`);
export const getReviewSummary = (productId) => axiosClient.get(`/products/${productId}/reviews/summary`);
export const getReviewEligibility = (productId) => axiosClient.get(`/products/${productId}/reviews/eligibility`);
export const createReview = (productId, rating, comment) =>
  axiosClient.post(`/products/${productId}/reviews`, { rating, comment });
export const updateReview = (reviewId, rating, comment) =>
  axiosClient.put(`/reviews/${reviewId}`, { rating, comment });
export const deleteReview = (reviewId) => axiosClient.delete(`/reviews/${reviewId}`);