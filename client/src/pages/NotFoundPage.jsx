// frontend/src/pages/NotFoundPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { IoAlertCircleOutline } from 'react-icons/io5';

const NotFoundPage = () => {
  return (
    // We use min-h-screen to ensure it takes full height, even if Navbar is present (in development)
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center text-center max-w-md">

        {/* --- Icon and Large Text --- */}
        <IoAlertCircleOutline className="h-20 w-20 text-red-500 mb-4" />
        <h1 className="text-8xl font-extrabold text-text-accent">
          404
        </h1>

        {/* --- Message --- */}
        <h2 className="mt-4 text-3xl font-bold text-text-primary">
          Page Not Found
        </h2>
        <p className="mt-3 text-lg text-text-secondary">
          Oops! The trend you were looking for doesn't exist or has been twisted into something new.
        </p>

        {/* --- Navigation Button --- */}
        <Link to="/" className="mt-8 w-full">
          <Button fullWidth>
            Go to Home Feed
          </Button>
        </Link>

        {/* --- Optional: Link to Trending --- */}
        <Link to="/trending" className="mt-4 w-full">
          <Button variant="secondary" fullWidth>
            See What's Trending
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;