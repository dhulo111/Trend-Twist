// frontend/src/components/features/feed/StoryCircle.jsx (UPDATED)

import React from 'react';
import Avatar from '../../common/Avatar';
import { IoAdd, IoAddCircleSharp } from 'react-icons/io5';

const StoryCircle = ({
  storyGroup,
  isCurrentUser = false,
  isProfileContext = false,
  onClick,
  size = 'lg'
}) => {

  if (!storyGroup) return null;

  const { username, profile_picture, hasUnseen, stories } = storyGroup;

  // Logic: Show add icon if it's the current user AND (no stories OR explicitly requested contextual logic)
  // Here we stick to showing it if no stories exist for clarity, or if it's the dedicated 'Your Story' bubble.
  const showAddIcon = isCurrentUser && (stories?.length === 0) && !isProfileContext;

  const displayName = isCurrentUser ? 'Your Story' : username;

  return (
    <div
      className="flex flex-col items-center flex-shrink-0 cursor-pointer group pl-4 relative"
      onClick={onClick}
    >
      {/* Ring Container */}
      <div className="relative p-[3px]">
        {/* Animated Gradient Ring for Unseen */}
        {hasUnseen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 animate-spin opacity-90 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '3s' }} />
        )}

        {/* Grey Ring for Seen */}
        {!hasUnseen && (
          <div className="absolute inset-0 rounded-full border border-border group-hover:border-text-secondary transition-colors" />
        )}

        {/* Avatar Container with Gap */}
        <div className="relative bg-bg-primary rounded-full p-[2px] z-10">
          <Avatar
            src={profile_picture}
            alt={username}
            size={size}
            className="transition-transform duration-300 transform group-hover:scale-105"
          />

          {/* Add Icon Overlay */}
          {showAddIcon && (
            <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-bg-primary shadow-sm flex items-center justify-center">
              <IoAdd className="h-4 w-4 stroke-2" />
            </div>
          )}
        </div>
      </div>

      {/* Username */}
      {!isProfileContext && (
        <span className={`mt-1.5 text-xs truncate max-w-[70px] text-center tracking-wide
            ${isCurrentUser ? 'text-text-primary font-medium' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`}>
          {displayName}
        </span>
      )}
    </div>
  );
};

export default StoryCircle;