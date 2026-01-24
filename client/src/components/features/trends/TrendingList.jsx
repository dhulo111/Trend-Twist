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
const TrendingList = ({ onTrendClick, activeTrend }) => {
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
          hashtags.map((tag, index) => {
            const isActive = activeTrend === tag.name;
            return (
              <div
                key={tag.id}
                onClick={() => onTrendClick && onTrendClick(tag.name)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${isActive
                  ? 'bg-background-accent/20 border-accent/50 shadow-[0_0_15px_rgba(255,0,80,0.15)]'
                  : 'bg-transparent border-transparent hover:bg-background-accent hover:border-white/5'
                  }`}
              >
                {/* Rank and Name */}
                <div className="flex items-center space-x-3 group w-full">
                  <span className={`text-lg font-bold w-6 text-center ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
                    #{index + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-bold transition-colors ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                      #{tag.name}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {tag.post_count} Posts
                    </span>
                  </div>
                </div>

                {/* Arrow Icon for improved affordability */}
                <div className={`text-accent transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                  <IoMdTrendingUp />
                </div>
              </div>
            );
          })
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