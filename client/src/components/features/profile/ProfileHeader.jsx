// frontend/src/components/features/profile/ProfileHeader.jsx

import React, { useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { toggleFollow } from '../../../api/userApi';
import Avatar from '../../common/Avatar';
import Button from '../../common/Button';
// Modal import removed as it was only used for Edit Profile
import Spinner from '../../common/Spinner';
import { IoSettingsOutline, IoLink, IoLockClosed, IoPersonAddOutline } from 'react-icons/io5';
import { Link, useNavigate } from 'react-router-dom';
import FollowListModal from './FollowListModal';
import StoryCircle from '../feed/StoryCircle';

const ProfileHeader = ({ profileData, onProfileUpdate, userStories, handleStoryClick, isOwner }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loadingFollow, setLoadingFollow] = useState(false);

  // --- States for FollowListModal ---
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listType, setListType] = useState('followers');

  // --- Dynamic Data from profileData ---
  const isPrivate = profileData.profile?.is_private;
  const isFollowing = profileData.is_following;
  const hasPendingRequest = profileData.has_pending_request;

  // Counts (Assumed from UserSerializer)
  const postsCount = profileData.posts_count || 0;
  const followersCount = profileData.followers_count || 0;
  const followingCount = profileData.following_count || 0;

  // Story Logic Check
  const hasStories = userStories?.stories.length > 0;

  // --- Handlers ---
  const handleFollowToggle = async () => {
    if (!currentUser) return;
    setLoadingFollow(true);
    try {
      await toggleFollow(profileData.id);
      onProfileUpdate(); // CRITICAL: Refresh parent page to update live stats
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setLoadingFollow(false);
    }
  };

  // --- Stat Click Handler (Opens FollowListModal) ---
  const handleStatClick = (type) => {
    const isAccessible = !isPrivate || isOwner || profileData.is_following;

    if (isAccessible) {
      setListType(type);
      setIsListModalOpen(true);
    } else {
      alert(`This profile is private. You must follow ${profileData.username} to view their ${type}.`);
    }
  };


  // --- Determine the Main Action Button ---
  const renderActionButton = () => {
    if (loadingFollow) {
      return <Button variant="disabled" disabled><Spinner size="sm" /></Button>;
    }

    if (isOwner) {
      return (
        <div className="flex space-x-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/edit')}>
            Edit Profile
          </Button>
          <Link to="/settings">
            <Button variant="secondary" size="sm" leftIcon={<IoSettingsOutline />}>
              Settings
            </Button>
          </Link>
        </div>
      );
    }

    if (isFollowing) {
      return (
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleFollowToggle}>Unfollow</Button>
          <Button
            variant="primary"
            onClick={() => navigate('/messages', { state: { startChatUser: profileData } })}
          >
            Message
          </Button>
        </div>
      );
    }

    if (hasPendingRequest) {
      return <Button variant="disabled" disabled>Requested</Button>;
    }

    // Default: Follow or Request
    const buttonText = isPrivate ? 'Request Follow' : 'Follow';
    const buttonIcon = isPrivate ? <IoLockClosed /> : <IoPersonAddOutline />;

    return (
      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={handleFollowToggle}
          leftIcon={buttonIcon}
        >
          {buttonText}
        </Button>
        {/* Message Button (Only if not private OR is following) */}
        {(!isPrivate || isFollowing) && (
          <Button
            variant="secondary"
            onClick={() => navigate('/messages', { state: { startChatUser: profileData } })}
          >
            Message
          </Button>
        )}
      </div>
    );
  };


  return (
    <div className="w-full glass-flat mb-4 md:mb-6 py-6 md:py-10 px-4 md:px-6 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden">
      {/* Decorative gradient overlay for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-r from-text-accent/5 to-transparent pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-12 max-w-5xl mx-auto">

        {/* 1. Avatar Section (Story Ring Integration) */}
        <div className="flex-shrink-0 flex flex-col items-center">

          {/* The Avatar/Story Ring Container */}
          {hasStories ? (
            // If user has stories OR it's the owner (to allow creation), use StoryCircle visual
            <div onClick={handleStoryClick}>
              <StoryCircle
                storyGroup={userStories}
                isCurrentUser={isOwner}
                isProfileContext={true}
                size="xl"
                onClick={() => { }}
              />
            </div>
          ) : (
            // Regular Avatar if no stories and not the owner
            <Avatar
              src={profileData.profile?.profile_picture}
              alt={profileData.username}
              size="xl"
            />
          )}

          {profileData.profile?.is_trendsetter && (
            <span className="mt-2 inline-block rounded-full bg-text-accent px-3 py-1 text-xs font-bold text-white shadow-md">
              ✨ Trendsetter
            </span>
          )}
        </div>

        {/* 2. Details and Action */}
        <div className="flex-grow w-full md:w-auto text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center justify-between mb-2 space-y-2 md:space-y-0">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary md:mr-4">
              {profileData.username}
            </h1>
            <div className="flex-shrink-0">
              {renderActionButton()}
            </div>
          </div>

          {/* Full Name and Private Tag */}
          <p className="text-base md:text-lg text-text-secondary mb-3 flex items-center justify-center md:justify-start space-x-2">
            <span className='font-semibold'>{profileData.first_name} {profileData.last_name}</span>
            {isPrivate && (
              <span className="text-xs px-2 py-0.5 bg-background-accent text-text-accent rounded-full flex items-center">
                <IoLockClosed className="h-3 w-3 mr-1" /> Private
              </span>
            )}
          </p>

          {/* Stats: Display Live Counts (CLICKABLE) */}
          <div className="mt-4 flex justify-center md:justify-start space-x-4 md:space-x-10 mb-4 border-t border-b border-border/50 py-2">

            {/* Posts Count (Not Clickable) */}
            <div className="text-center rounded-md p-1 min-w-[60px]">
              <span className="block text-lg font-bold text-text-primary">
                {postsCount}
              </span>
              <span className="text-xs md:text-sm text-text-secondary">Posts</span>
            </div>

            {/* Followers Count */}
            <div
              className="text-center cursor-pointer hover:bg-background-accent/30 rounded-md p-1 min-w-[60px] transition-colors"
              onClick={() => handleStatClick('followers')}
            >
              <span className="block text-lg font-bold text-text-primary">
                {followersCount}
              </span>
              <span className="text-xs md:text-sm text-text-secondary">Followers</span>
            </div>

            {/* Following Count */}
            <div
              className="text-center cursor-pointer hover:bg-background-accent/30 rounded-md p-1 min-w-[60px] transition-colors"
              onClick={() => handleStatClick('following')}
            >
              <span className="block text-lg font-bold text-text-primary">
                {followingCount}
              </span>
              <span className="text-xs md:text-sm text-text-secondary">Following</span>
            </div>
          </div>

          {/* Bio and Website */}
          <p className="text-text-primary text-sm whitespace-pre-line">
            {profileData.profile?.bio || 'No bio available.'}
          </p>
          {profileData.profile?.website_url && (
            <a
              href={profileData.profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center space-x-1 text-text-accent hover:underline text-sm"
            >
              <IoLink className='h-4 w-4' />
              <span>{profileData.profile.website_url}</span>
            </a>
          )}
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Follow List Modal (Followers/Following) */}
      <FollowListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        type={listType}
        username={profileData.username}
      />
    </div>
  );
};

export default ProfileHeader;