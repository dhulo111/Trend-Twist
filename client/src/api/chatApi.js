// frontend/src/api/chatApi.js

import axiosInstance from "./axiosInstance";

/**
 * Fetches the user's chat inbox (list of all chat rooms).
 * @returns {Array} List of chat room objects, sorted by last message time.
 */
export const getChatInbox = async () => {
  try {
    const response = await axiosInstance.get("/chats/");
    return response.data;
  } catch (error) {
    console.error("Error fetching chat inbox:", error);
    throw error;
  }
};

/**
 * Fetches the message history for a specific chat partner.
 * @param {number} userId - The ID of the other user in the chat.
 * @returns {Array} List of ChatMessage objects.
 */
export const getChatHistory = async (userId) => {
  try {
    // This API call automatically marks incoming messages as read.
    const response = await axiosInstance.get(`/chats/${userId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat history with user ${userId}:`, error);
    throw error;
  }
};

// Note: Sending new messages is handled directly by the WebSocket (ChatConsumer),
// not via a standard REST API call.
