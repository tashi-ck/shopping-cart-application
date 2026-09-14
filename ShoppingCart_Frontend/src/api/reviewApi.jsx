import axiosClient from "./axiosClient";

export const getReviews = (productId) => axiosClient.get(`/products/${productId}/reviews`);
export const getReviewSummary = (productId) => axiosClient.get(`/products/${productId}/reviews/summary`);
export const getReviewEligibility = (productId) => axiosClient.get(`/products/${productId}/reviews/eligibility`);
export const createReview = (productId, rating, comment) =>
  axiosClient.post(`/products/${productId}/reviews`, { rating, comment });
export const updateReview = (reviewId, rating, comment) =>
  axiosClient.put(`/reviews/${reviewId}`, { rating, comment });
export const deleteReview = (reviewId) => axiosClient.delete(`/reviews/${reviewId}`);

export const voteHelpful = (reviewId, isHelpful) =>
  axiosClient.post(`/reviews/${reviewId}/helpful`, { isHelpful });
export const removeVote = (reviewId) => axiosClient.delete(`/reviews/${reviewId}/helpful`);

export const getPendingReviews = () => axiosClient.get("/reviews/admin/pending");
export const moderateReview = (reviewId, approve, rejectionReason) =>
  axiosClient.put(`/reviews/admin/${reviewId}/moderate`, { approve, rejectionReason });

export const getProcessedReviews = () => axiosClient.get("/reviews/admin/processed");
export const getReviewDetailForAdmin = (reviewId) => axiosClient.get(`/reviews/admin/${reviewId}`);