// frontend/src/routes/ProtectedRoute.jsx

import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // 1. Show a loading state while AuthContext is checking user status
  // This prevents flickering to the login page on a refresh
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-primary">
        {/* You can replace this with a dedicated Spinner component */}
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }
  console.log(user);

  // 2. If user is not loading and is not logged in, redirect to login
  if (!user) {
    // We save the 'location' they were trying to go to.
    // This allows us to redirect them back after they log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If user is logged in, render the page they requested
  return children;
};

export default ProtectedRoute;