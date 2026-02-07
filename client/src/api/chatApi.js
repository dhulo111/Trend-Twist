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
// UPDATE: We now have a REST endpoint for quick messages (like from Story Viewer)
export const sendMessage = async (recipientUsername, content, storyId = null) => {
  try {
    const response = await axiosInstance.post('/messages/send/', {
      recipient_username: recipientUsername,
      content,
      story_id: storyId
    });
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// --- Group Chat ---

export const getGroups = async () => {
    try {
        const response = await axiosInstance.get('/groups/');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getGroupMessages = async (groupId) => {
    try {
        const response = await axiosInstance.get(`/groups/${groupId}/messages/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createGroup = async (name, memberIds, iconFile) => {
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('members', memberIds.join(',')); // "1,2,3"
        if (iconFile) {
            formData.append('icon', iconFile);
        }
        const response = await axiosInstance.post('/groups/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const sendGroupMessage = async (groupId, content, storyId = null) => {
    try {
        const response = await axiosInstance.post('/messages/send/', {
            group_id: groupId,
            content,
            story_id: storyId
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateGroupMembers = async (groupId, addIds, removeIds) => {
    try {
        const payload = {};
        if (addIds && addIds.length > 0) payload.add_members = addIds.join(',');
        if (removeIds && removeIds.length > 0) payload.remove_members = removeIds.join(',');
        
        const response = await axiosInstance.patch(`/groups/${groupId}/`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateGroupDetails = async (groupId, name, iconFile) => {
    try {
        const formData = new FormData();
        if (name) formData.append('name', name);
        if (iconFile) formData.append('icon', iconFile);
        
        const response = await axiosInstance.patch(`/groups/${groupId}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteGroup = async (groupId) => {
    try {
        await axiosInstance.delete(`/groups/${groupId}/`);
    } catch (error) {
        throw error;
    }
};
