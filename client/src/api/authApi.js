// frontend/src/api/authApi.js

import axiosInstance from "./axiosInstance";

// --- 1. Login Flow ---

export const checkUserExists = async (usernameOrEmail) => {
  try {
    const response = await axiosInstance.post("/auth/check-user/", {
      username_or_email: usernameOrEmail,
    });
    return response.data; // Returns { exists: true/false }
  } catch (error) {
    console.error("Check User API error:", error);
    throw error;
  }
};

export const loginWithPassword = async (usernameOrEmail, password) => {
  try {
    const response = await axiosInstance.post("/auth/login/password/", {
      username_or_email: usernameOrEmail,
      password: password,
    });

    if (response.status === 200) {
      const authToken = {
        access: response.data.access,
        refresh: response.data.refresh,
      };
      const user = response.data.user;
      localStorage.setItem("authToken", JSON.stringify(authToken));
      return { authToken, user };
    }
  } catch (error) {
    console.error("Login with Password API error:", error);
    throw error;
  }
};

export const googleLogin = async (googleToken) => {
  try {
    const response = await axiosInstance.post("/auth/google/", {
      token: googleToken,
    });

    if (response.status === 200) {
      // Backend returns { access, refresh, user }
      const authToken = {
        access: response.data.access,
        refresh: response.data.refresh,
      };
      const user = response.data.user;

      localStorage.setItem("authToken", JSON.stringify(authToken));
      return { authToken, user };
    }
  } catch (error) {
    console.error("Google Login API error:", error);
    throw error;
  }
};

// --- 2. Registration Flow ---

export const registerWithPassword = async (registrationData) => {
  try {
    const response = await axiosInstance.post(
      "/auth/register/password/",
      registrationData
    );

    if (response.status === 201) {
      const authToken = {
        access: response.data.access,
        refresh: response.data.refresh,
      };
      const user = response.data.user;
      localStorage.setItem("authToken", JSON.stringify(authToken));
      return { authToken, user };
    }
  } catch (error) {
    console.error("Register with Password API error:", error);
    throw error;
  }
};

// --- 3. Logout ---

/**
 * Logs out the user by removing tokens.
 */
export const logout = () => {
  localStorage.removeItem("authToken");
};
