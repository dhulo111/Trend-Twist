// frontend/src/api/postApi.js

import axiosInstance from "./axiosInstance";

export const getFeedPosts = async () => {
  try {
    const response = await axiosInstance.get("/posts/");
    return response.data;
  } catch (error) {
    console.error("Error fetching feed posts:", error);
    throw error;
  }
};

export const createPost = async (postData) => {
  try {
    const response = await axiosInstance.post("/posts/", postData, {
      headers: {
        // Important: Let browser set Content-Type for FormData
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};


export const getPostDetail = async (postId) => {
  try {
    const response = await axiosInstance.get(`/posts/${postId}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching post detail:", error);
    throw error;
  }
};


export const deletePost = async (postId) => {
  try {
    await axiosInstance.delete(`/posts/${postId}/`);
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};


export const toggleLike = async (postId) => {
  try {
    const response = await axiosInstance.post(`/posts/${postId}/like/`);
    return response.data;
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};

export const getComments = async (postId) => {
  try {
    const response = await axiosInstance.get(`/posts/${postId}/comments/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};


export const createComment = async (postId, text) => {
  try {
    const response = await axiosInstance.post(`/posts/${postId}/comments/`, {
      text: text,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
};


export const deleteComment = async (commentId) => {
  try {
    await axiosInstance.delete(`/comments/${commentId}/`);
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};


export const createTwist = async (originalPostId, twistData) => {
  try {
    const response = await axiosInstance.post(
      `/posts/${originalPostId}/twists/`,
      twistData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating twist:", error);
    throw error;
  }
};

export const getPostsByUser = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}/posts/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    throw error;
  }
};
