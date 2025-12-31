// frontend/src/components/features/profile/FollowListModal.jsx

import React, { useState, useEffect } from 'react';
import { getFollowers, getFollowing } from '../../../api/userApi'; // Assuming these APIs exist
import Modal from '../../common/Modal';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import { Link } from 'react-router-dom';
import { IoPersonOutline } from 'react-icons/io5';

const FollowListModal = ({ isOpen, onClose, type, username }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFollowers = type === 'followers';
  const title = isFollowers ? 'Followers' : 'Following';

  // --- Fetch Data ---
  useEffect(() => {
    if (!isOpen || !username) return;

    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiCall = isFollowers ? getFollowers : getFollowing;
        const data = await apiCall(username);
        setList(data);
      } catch (e) {
        setError(`Failed to load ${title}. User not found or network error.`);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [isOpen, username, type]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setList([]);
      setError(null);
    }
  }, [isOpen]);

  // --- Render List Content ---
  const renderListContent = () => {
    if (loading) {
      return <div className="text-center py-12"><Spinner size="lg" /></div>;
    }
    if (error) {
      return <p className="text-red-500 text-center py-5">{error}</p>;
    }
    if (list.length === 0) {
      return (
        <div className="text-center py-10 text-black">
          <IoPersonOutline className="h-10 w-10 mx-auto mb-3" />
          <p className='font-medium'>
            {isFollowers
              ? `${username} has no followers yet.`
              : `${username} is not following anyone.`}
          </p>
        </div>
      );
    }

    // Display the list of users
    return (
      <div className="space-y-1 overflow-y-auto max-h-[400px]">
        {list.map((item) => {
          // 'item' contains either 'follower_username' or 'following_username'
          const displayUser = item.follower_username || item.following_username;
          const userProfilePic = item.follower_profile_pic || item.following_profile_pic; // Assuming API provides this later

          return (
            <Link
              key={item.follower || item.following} // Use the ID as the key
              to={`/profile/${displayUser}`}
              onClick={onClose} // Close modal on navigation
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-background-accent transition-colors"
            >
              <Avatar src={userProfilePic} alt={displayUser} size="md" />
              <p className="font-semibold text-black">{displayUser}</p>
              {/* Optional: Add a small 'Unfollow' button here if appropriate */}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${title} (${list.length})`}
      className="max-w-md bg-white"
    >
      {renderListContent()}
    </Modal>
  );
};

export default FollowListModal;