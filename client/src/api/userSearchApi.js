// frontend/src/api/userSearchApi.js

import axiosInstance from "./axiosInstance";

/**
 * Searches users by username or name.
 * @param {string} query
 * @returns {Array} List of User objects (with is_following/has_pending_request status)
 */
export const searchUsers = async (query) => {
  try {
    const response = await axiosInstance.get(`/users/search/?q=${query}`);
    return response.data;
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

/**
 * Toggles follow status (Follow/Request/Cancel Request/Unfollow).
 * @param {number} userId - The ID of the user to follow/unfollow.
 * @returns {object} Status message.
 */
export const toggleFollow = async (userId) => {
  try {
    const response = await axiosInstance.post(`/users/${userId}/follow/`);
    return response.data;
  } catch (error) {
    console.error("Error toggling follow:", error);
    throw error;
  }
};
