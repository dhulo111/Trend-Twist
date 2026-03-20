// frontend/src/api/axiosInstance.js

import axios from "axios";
import config from "../config";

const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Add the auth token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const authTokenRaw = localStorage.getItem("authToken");
    let access = null;

    if (authTokenRaw) {
      try {
        const parsed = JSON.parse(authTokenRaw);
        access = parsed.access;
      } catch (e) {
        console.error("Failed to parse authToken", e);
      }
    }

    // Fallback to direct 'access_token' (used by Admin login)
    if (!access) {
      access = localStorage.getItem("access_token");
    }

    if (access) {
      config.headers["Authorization"] = `Bearer ${access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch globally 403 Forbidden for Blocked Users
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 403) {
        const errorData = error.response.data;
        if (errorData?.error && errorData.error.toLowerCase().includes('blocked') && errorData?.contact) {
            // It's a blocked user response
            window.location.href = `/blocked?reason=${encodeURIComponent(errorData.reason || '')}&until=${encodeURIComponent(errorData.blocked_until || '')}`;
            // optionally clear auth tokens
            localStorage.removeItem('authToken');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
