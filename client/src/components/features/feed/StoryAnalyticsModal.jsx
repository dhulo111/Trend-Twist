// frontend/src/components/features/feed/StoryAnalyticsModal.jsx

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import Button from '../../common/Button';
import { IoEyeOutline, IoCloseOutline, IoCloudOfflineOutline } from 'react-icons/io5';
import { getStoryAnalytics } from '../../../api/storyApi'; // API to fetch viewer list
import { Link } from 'react-router-dom';


const StoryAnalyticsModal = ({ isOpen, onClose, storyId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch Analytics on Open ---
  const fetchAnalytics = async () => {
    if (!storyId) return;

    setLoading(true);
    setError(null);

    try {
      // API call to GET /api/stories/<storyId>/analytics/
      const data = await getStoryAnalytics(storyId);
      setAnalytics(data); // data = { total_views: N, viewers: [...] }
    } catch (e) {
      // Handle permission errors (e.g., 403 Forbidden if not the author)
      const errorMsg =
        e.response?.status === 403
          ? "Permission Denied. You are not the owner of this story."
          : "Failed to load viewer list.";
      setError(errorMsg);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, storyId]);

  // --- Render Functions ---

  const renderViewerList = () => {
    if (loading) {
      return <div className="text-center py-10"><Spinner size="lg" /></div>;
    }

    if (error) {
      return (
        <div className="text-center py-5 text-red-500 bg-red-500/10 rounded-lg">
          <IoCloudOfflineOutline className="h-6 w-6 mx-auto mb-2" />
          <p className='text-sm'>{error}</p>
        </div>
      );
    }

    if (!analytics || analytics.total_views === 0) {
      return (
        <div className="text-center py-10 text-text-secondary">
          <IoEyeOutline className="h-10 w-10 mx-auto mb-3" />
          <p className='font-medium'>No views yet. Be the first to check back!</p>
        </div>
      );
    }

    // Display the list of viewers
    return (
      <div className="space-y-1 overflow-y-auto max-h-[300px] pr-2">
        {analytics.viewers.map((viewer) => (
          <Link
            key={viewer.id}
            to={`/profile/${viewer.username}`}
            onClick={onClose} // Close modal on navigation
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-background-accent transition-colors"
          >
            <Avatar src={viewer.profile?.profile_picture} size="md" />
            <div className="flex-1">
              <p className="font-semibold text-text-primary">{viewer.username}</p>
              <p className="text-sm text-text-secondary">
                {viewer.first_name} {viewer.last_name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Story Analytics"
      className="max-w-md bg-white"
    >
      <div className="flex flex-col -mt-3">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <IoEyeOutline className="h-6 w-6 text-text-accent" />
            <h3 className="text-xl font-bold text-black">
              {analytics?.total_views || 0} Total Views
            </h3>
          </div>
        </div>

        {renderViewerList()}
      </div>
    </Modal>
  );
};

export default StoryAnalyticsModal;