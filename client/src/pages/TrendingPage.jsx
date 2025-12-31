// frontend/src/pages/TrendingPage.jsx

import React from 'react';
import TrendingList from '../components/features/trends/TrendingList'; // Import the main trending list

const TrendingPage = () => {
  return (
    <div className="w-full min-h-screen px-4 lg:px-8 pb-12 pt-4">

      {/* --- Header --- */}
      <h1 className="mb-6 text-3xl font-bold text-text-primary">
        🔥 What's Trending Now
      </h1>

      {/* --- Main Dashboard Area --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 1. Trending Hashtags (Main Component) */}
        <div className="lg:col-span-2 card">
          <TrendingList />
        </div>

        {/* 2. Right Sidebar (Analytics/Tutorials Placeholder) */}
        <div className="lg:col-span-1 space-y-6">

          {/* Trend Explanation Card */}
          <div className="card">
            <h3 className="font-semibold text-xl text-text-accent mb-2">
              Understanding the "Twist"
            </h3>
            <p className="text-text-secondary text-sm">
              The core of TrendTwist is the Twist feature, which is how a trend evolves. The more a post is 'Twisted' by others, the higher it and its related hashtags rank on this dashboard.
            </p>
            <button
              className="mt-3 text-sm text-text-primary font-medium hover:text-text-accent"
              onClick={() => alert("Opening Trend Tutorial Video...")}
            >
              Watch Tutorial
            </button>
          </div>

          {/* Live Data Feed Placeholder */}
          <div className="card">
            <h3 className="font-semibold text-xl text-text-primary mb-2">
              Live Updates
            </h3>
            <p className="text-text-secondary text-sm">
              Live feed of the most recent posts that use the current top #1 trend.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TrendingPage;