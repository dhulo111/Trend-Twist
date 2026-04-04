// frontend/src/context/AuthContext.jsx (FINAL FIX for Refresh Issue)

import React, { createContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  checkUserExists as apiCheckUserExists,
  loginWithPassword as apiLoginWithPassword,
  registerWithPassword as apiRegisterWithPassword,
  logout as apiLogout,
  googleLogin as apiGoogleLogin,
} from '../api/authApi';
import axiosInstance from '../api/axiosInstance';
import { getCurrentUser } from '../api/userApi';
import config from '../config';

export const AuthContext = createContext();

// --- Helper Function: Fetches Full User Profile (No Navigation Here) ---
const setFullUserState = async (authToken, setUser) => {
  localStorage.setItem('authToken', JSON.stringify(authToken));

  try {
    // Note: axiosInstance must be configured before this call succeeds
    const fullUserData = await getCurrentUser();
    setUser(fullUserData);
    return true;
  } catch (error) {
    console.error("Failed to fetch full user profile after login/refresh.", error);
    apiLogout();
    setUser(null);
    return false;
  }
};


export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // 1. State Management
  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem('authToken')
      ? JSON.parse(localStorage.getItem('authToken'))
      : null
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const authTokenRef = useRef(authToken);

  // --- 2. useEffect for axios Header Management (CRITICAL FIX) ---
  // This ensures axios always uses the current token from the state/ref.
  useEffect(() => {
    authTokenRef.current = authToken; // Always keep ref updated

    if (authToken?.access) {
      // Set the Authorization header globally for all authenticated API calls
      axiosInstance.defaults.headers.common['Authorization'] =
        `Bearer ${authToken.access}`;
    } else {
      // Clear the header if the user logs out
      delete axiosInstance.defaults.headers.common['Authorization'];
    }
  }, [authToken]); // Runs every time authToken state changes

  // 3. --- Logout Function ---
  const logoutUser = () => {

    apiLogout();
    setAuthToken(null);
    setUser(null);
    navigate('/login');
  };


  // 4. --- Token Refresh and Initial User Fetch (Runs on Mount) ---
  // The dependencies are clean to avoid the infinite loop issue.
  useEffect(() => {
    let isMounted = true;

    const checkUserAndRefresh = async () => {
      const currentToken = authTokenRef.current;

      if (!currentToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // First, try to refresh the token using the existing refresh token
        const response = await axiosInstance.post('/token/refresh/', {
          refresh: currentToken.refresh,
        });

        if (isMounted && response.status === 200) {
          const newAuthToken = response.data;
          setAuthToken(newAuthToken); // This will trigger the header update (useEffect 2)

          // Fetch full user profile
          await setFullUserState(newAuthToken, setUser);
        } else if (isMounted) {
          logoutUser();
        }
      } catch (error) {
        if (isMounted) {
          // Token refresh failed or expired, log out
          logoutUser();
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    // Initial check on mount
    checkUserAndRefresh();

    // Set interval to refresh token periodically
    const refreshInterval = 1000 * 60 * 55; // 55 minutes
    const interval = setInterval(() => {
      if (authTokenRef.current) {
        checkUserAndRefresh();
      }
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      isMounted = false;
    };

  }, [navigate]);

  // 5. --- Login/Register Handlers (Set AuthToken and Navigate) ---

  const checkUserExists = async (usernameOrEmail) => {
    try {
      return await apiCheckUserExists(usernameOrEmail);
    } catch (error) {
      throw error;
    }
  };

  const loginWithPassword = async (usernameOrEmail, password) => {
    try {
      const { authToken: newAuthToken } = await apiLoginWithPassword(usernameOrEmail, password);
      setAuthToken(newAuthToken);

      if (await setFullUserState(newAuthToken, setUser)) {
        navigate('/');
      }
    } catch (error) {
      throw error;
    }
  };

  const registerWithPassword = async (registrationData) => {
    try {
      const { authToken: newAuthToken } = await apiRegisterWithPassword(registrationData);
      setAuthToken(newAuthToken);

      if (await setFullUserState(newAuthToken, setUser)) {
        navigate('/');
      }
    } catch (error) {
      throw error;
    }
  };

  const googleLogin = async (googleToken) => {
    try {
      const { authToken: newAuthToken } = await apiGoogleLogin(googleToken);

      setAuthToken(newAuthToken);

      if (await setFullUserState(newAuthToken, setUser)) {
        navigate('/');
      }
    } catch (error) {
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user profile", error);
    }
  };

  // 6. --- Context Data ---
  const contextData = {
    user,
    authToken,
    loading,
    checkUserExists,
    loginWithPassword,
    registerWithPassword,
    googleLogin,
    logoutUser,
    refreshUserProfile,
  };

  // 7. --- Provider ---
  return (
    <AuthContext.Provider value={contextData}>
      {/* Renders children only when loading is false */}
      {!loading && children}
    </AuthContext.Provider>
  );
};