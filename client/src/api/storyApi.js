// frontend/src/api/storyApi.js

import axiosInstance from "./axiosInstance";

/**
 * Fetches active stories from followed users and the current user.
 * @returns {Array} List of stories.
 */
export const getStories = async () => {
  try {
    // API endpoint for stories list/creation
    const response = await axiosInstance.get("/stories/");
    return response.data;
  } catch (error) {
    console.error("Error fetching stories:", error);
    throw error;
  }
};

/**
 * Registers that the current user has viewed this story.
 * @param {number} storyId
 */
export const registerView = async (storyId) => {
  try {
    await axiosInstance.post(`/stories/${storyId}/view/`);
  } catch (error) {
    // Ignore error if already viewed
    console.error("Failed to register story view:", error);
  }
};

/**
 * Creates a new story.
 * @param {FormData} storyData
 */
export const createStory = async (storyData) => {
  try {
    const response = await axiosInstance.post("/stories/", storyData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating story:", error);
    throw error;
  }
};

export const getStoryAnalytics = async (storyId) => {
  try {
    // Calls the backend endpoint created in views.py
    const response = await axiosInstance.get(`/stories/${storyId}/analytics/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching story analytics:", error);
    // Throw error so the modal can display "Permission Denied" if user is not the author
    throw error;
  }
};

export const deleteStory = async (storyId) => {
  try {
    // API endpoint: DELETE /api/stories/<storyId>/
    const response = await axiosInstance.delete(`/stories/${storyId}/`);
    return response.data;
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
};

export const getStoriesByUser = async (userId) => {
  try {
    // Assume API endpoint is /api/stories/user/<userId>/
    const response = await axiosInstance.get(`/stories/user/${userId}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stories for profile:", error);
    // Return empty array on failure so the page can still render
    return [];
  }
};
