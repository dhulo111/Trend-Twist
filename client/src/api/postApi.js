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


// --- Standalone Twist API ---

export const createTwist = async (twistData) => {
  try {
    // Now hits the standalone endpoint
    const response = await axiosInstance.post("/twists/", twistData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating twist:", error);
    throw error;
  }
};

export const getTwistsByUser = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}/twists/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching twists for user ${userId}:`, error);
    throw error;
  }
};

export const getPublicTwists = async (tag) => {
    try {
        const response = await axiosInstance.get(`/twists/public/?tag=${tag || ''}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching public twists:", error);
        throw error;
    }
}

export const toggleTwistLike = async (twistId) => {
  try {
    const response = await axiosInstance.post(`/twists/${twistId}/like/`);
    return response.data;
  } catch (error) {
    console.error("Error toggling twist like:", error);
    throw error;
  }
};

export const deleteTwist = async (twistId) => {
    try {
        await axiosInstance.delete(`/twists/${twistId}/`);
    } catch (error) {
        console.error("Error deleting twist:", error);
        throw error;
    }
};

export const getTwistComments = async (twistId) => {
    try {
        const response = await axiosInstance.get(`/twists/${twistId}/comments/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching twist comments:", error);
        throw error;
    }
}

export const createTwistComment = async (twistId, text) => {
    try {
        const response = await axiosInstance.post(`/twists/${twistId}/comments/`, { text: text });
        return response.data;
    } catch (error) {
        console.error("Error creating twist comment:", error);
        throw error;
    }
}

export const deleteTwistComment = async (commentId) => {
    try {
        await axiosInstance.delete(`/twist-comments/${commentId}/`);
    } catch (error) {
        console.error("Error deleting twist comment:", error);
        throw error;
    }
}

export const getPostsByUser = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}/posts/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    throw error;
  }
};

export const sharePost = async (postId, userIds) => {
  try {
    const response = await axiosInstance.post(`/posts/${postId}/share/`, {
      user_ids: userIds
    });
    return response.data;
  } catch (error) {
    console.error("Error sharing post:", error);
    throw error;
  }
};
