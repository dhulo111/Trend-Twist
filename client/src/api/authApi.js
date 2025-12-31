// frontend/src/api/authApi.js

import axiosInstance from "./axiosInstance";

// --- 1. Login Flow ---

export const requestLoginOTP = async (email) => {
  try {
    const response = await axiosInstance.post("/auth/login/request-otp/", {
      email: email,
    });
    return response.data; // Returns { id: "..." }
  } catch (error) {
    console.error("Request Login OTP API error:", error);
    throw error; // Re-throw to be handled by the component
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

export const verifyRegistrationOTP = async (id, otp) => {
  try {
    // New endpoint created in views.py
    const response = await axiosInstance.post(
      "/auth/register/verify-only-otp/",
      {
        id: id,
        otp: otp,
      }
    );
    return response.data; // Should return {"status": "OTP verified"}
  } catch (error) {
    console.error("Verify Registration OTP API error:", error);
    throw error;
  }
};

export const verifyLoginOTP = async (id, otp) => {
  try {
    const response = await axiosInstance.post("/auth/login/verify-otp/", {
      id: id,
      otp: otp,
    });

    if (response.status === 200) {
      // Backend returns { access, refresh, user }
      const authToken = {
        access: response.data.access,
        refresh: response.data.refresh,
      };
      const user = response.data.user;

      // Store tokens in localStorage
      localStorage.setItem("authToken", JSON.stringify(authToken));

      return { authToken, user };
    }
  } catch (error) {
    console.error("Verify Login OTP API error:", error);
    throw error;
  }
};

// --- 2. Registration Flow ---

export const requestRegisterOTP = async (email) => {
  try {
    const response = await axiosInstance.post("/auth/register/request-otp/", {
      email: email,
    });
    return response.data; // Returns { id: "..." }
  } catch (error) {
    console.error("Request Register OTP API error:", error);
    throw error;
  }
};

export const completeRegistration = async (registrationData) => {
  try {
    const response = await axiosInstance.post(
      "/auth/register/complete/",
      registrationData
    );

    if (response.status === 201) {
      const authToken = {
        access: response.data.access,
        refresh: response.data.refresh,
      };
      const user = response.data.user;

      // Store tokens in localStorage
      localStorage.setItem("authToken", JSON.stringify(authToken));

      return { authToken, user };
    }
  } catch (error) {
    console.error("Complete Registration API error:", error);
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
