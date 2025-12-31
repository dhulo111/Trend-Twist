// frontend/src/components/features/trends/TrendingList.jsx

import React, { useState, useEffect } from 'react';
import { getTrendingHashtags } from '../../../api/trendsApi';
import Spinner from '../../common/Spinner';
import { IoMdTrendingUp } from 'react-icons/io';
import { BsInfoCircle } from 'react-icons/bs';
import Tooltip from '../../common/Tooltip';
import { Link } from 'react-router-dom';

/**
 * Renders the list of top 10 trending hashtags.
 */
const TrendingList = () => {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const data = await getTrendingHashtags();
        setHashtags(data);
      } catch (err) {
        setError('Failed to fetch trending hashtags. Please check the backend API.');
        console.error('Trend fetching error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  // --- Render Functions ---

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center card">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center text-red-500 p-6">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="card p-6 w-full">

      {/* --- Header --- */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <IoMdTrendingUp className="h-6 w-6 text-text-accent" />
          <h2 className="text-xl font-bold text-text-primary">
            Top Trends
          </h2>
        </div>

        {/* Info Tooltip about the trending logic */}
        <Tooltip
          content={
            <div className="max-w-xs text-left">
              <p className="font-bold mb-1">Trending Logic</p>
              <p className="text-sm">
                These hashtags are calculated by a background worker (Celery) based on the number of mentions and twists over the last 24 hours.
              </p>
            </div>
          }
          position="left"
        >
          <BsInfoCircle className="h-5 w-5 text-text-secondary cursor-pointer hover:text-text-primary" />
        </Tooltip>
      </div>

      {/* --- Hashtags List --- */}
      <div className="space-y-3">
        {hashtags.length > 0 ? (
          hashtags.map((tag, index) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-background-accent transition-colors"
            >
              {/* Rank and Name */}
              <Link to={`/search?q=%23${tag.name}`} className="flex items-center space-x-3 group">
                <span className="text-lg font-bold text-text-secondary w-6 text-center">
                  #{index + 1}
                </span>
                <span className="text-text-primary font-semibold group-hover:text-text-accent transition-colors">
                  #{tag.name}
                </span>
              </Link>

              {/* Post Count */}
              {/* Note: post_count is the actual field returned by the simplified view in views.py */}
              <span className="text-sm text-text-secondary">
                {tag.post_count} Posts
              </span>
            </div>
          ))
        ) : (
          <p className="text-center text-text-secondary p-4">
            No active trends found right now.
          </p>
        )}
      </div>
    </div>
  );
};

export default TrendingList;