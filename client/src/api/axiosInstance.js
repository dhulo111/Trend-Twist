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
    const authToken = localStorage.getItem("authToken")
      ? JSON.parse(localStorage.getItem("authToken"))
      : null;

    if (authToken) {
      config.headers["Authorization"] = `Bearer ${authToken.access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Note: We can add a response interceptor here later
// to automatically handle token refreshing.

export default axiosInstance;
