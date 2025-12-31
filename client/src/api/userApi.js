// frontend/src/api/userApi.js

import axiosInstance from "./axiosInstance";

export const getCurrentUser = async () => {
  try {
    // Calls the /api/user/ endpoint which requires a JWT token in the header.
    const response = await axiosInstance.get("/user/");
    return response.data;
  } catch (error) {
    console.error("Error fetching current user profile (API):", error);
    throw error;
  }
};

export const getUserProfile = async (username) => {
  try {
    const response = await axiosInstance.get(`/profiles/${username}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    // Uses PATCH method to only update provided fields
    const response = await axiosInstance.patch(
      "/profile/update/",
      profileData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const toggleFollow = async (userId) => {
  try {
    const response = await axiosInstance.post(`/users/${userId}/follow/`);
    return response.data;
  } catch (error) {
    console.error("Error toggling follow:", error);
    throw error;
  }
};

export const getFollowers = async (username) => {
  try {
    const response = await axiosInstance.get(
      `/profiles/${username}/followers/`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching followers:", error);
    throw error;
  }
};

export const getFollowing = async (username) => {
  try {
    const response = await axiosInstance.get(
      `/profiles/${username}/following/`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching following list:", error);
    throw error;
  }
};

export const getFollowRequests = async () => {
  try {
    // API endpoint: GET /api/requests/
    const response = await axiosInstance.get("/requests/");
    return response.data;
  } catch (error) {
    console.error("Error fetching follow requests:", error);
    throw error;
  }
};

export const handleFollowRequestAction = async (requestId, action) => {
  try {
    // API endpoint: POST /api/requests/<requestId>/<action>/
    const response = await axiosInstance.post(
      `/requests/${requestId}/${action}/`
    );
    return response.data;
  } catch (error) {
    console.error(`Error handling request action ${action}:`, error);
    throw error;
  }
};

export const searchUsers = async (query) => {
    const response = await axiosInstance.get(`/users/search/?q=${query}`);
    return response.data;
};
