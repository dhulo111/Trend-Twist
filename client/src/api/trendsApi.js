// frontend/src/api/trendsApi.js

import axiosInstance from "./axiosInstance";


export const getTrendingHashtags = async () => {
  try {
    // This endpoint is public (AllowAny)
    const response = await axiosInstance.get("/trends/hashtags/");
    return response.data;
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    throw error;
  }
};
