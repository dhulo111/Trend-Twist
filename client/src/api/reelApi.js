import axiosInstance from './axiosInstance';

export const fetchReels = async () => {
    const response = await axiosInstance.get('/reels/');
    return response.data;
};

export const fetchReelDetails = async (id) => {
    const response = await axiosInstance.get(`/reels/${id}/`);
    return response.data;
};

export const createReel = async (formData) => {
    const response = await axiosInstance.post('/reels/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const likeReel = async (id) => {
    const response = await axiosInstance.post(`/reels/${id}/like/`);
    return response.data;
};

export const fetchReelComments = async (id) => {
    const response = await axiosInstance.get(`/reels/${id}/comments/`);
    return response.data;
};

export const addReelComment = async (id, text) => {
    const response = await axiosInstance.post(`/reels/${id}/comments/`, { text });
    return response.data;
};

// New function for profile integration
export const getReelsByUser = async (userId) => {
    const response = await axiosInstance.get(`/reels/user/${userId}/`);
    return response.data;
};

export const deleteReel = async (id) => {
    const response = await axiosInstance.delete(`/reels/${id}/`);
    return response.data;
};

export const shareReel = async (id, recipientIds) => {
    const response = await axiosInstance.post(`/reels/${id}/share/`, { recipient_ids: recipientIds });
    return response.data;
};

export const registerReelView = async (id) => {
    const response = await axiosInstance.post(`/reels/${id}/view/`);
    return response.data;
};
