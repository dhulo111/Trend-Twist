// frontend/src/components/features/feed/StoryCircleList.jsx

import React, { useContext, useRef } from 'react';
import StoryCircle from './StoryCircle';
import { AuthContext } from '../../../context/AuthContext';
import { IoChevronForward, IoChevronBack } from 'react-icons/io5';

/**
 * Manages and displays the horizontal list of story circles.
 */
const StoryCircleList = ({ storyGroups, onSelectStory, onYourStoryClick }) => {
  const { user } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const currentUserUsername = user?.username;

  // --- 1. Separate Current User's Story and Feed Stories ---
  const currentUserStoryGroup = storyGroups.find(
    (group) => group.username === currentUserUsername
  );

  // Data structure for the 'Your Story' circle
  const yourStoryData = {
    username: currentUserUsername || 'You',
    profile_picture: user?.profile?.profile_picture,
    hasUnseen: currentUserStoryGroup ? currentUserStoryGroup.hasUnseen : true,
    stories: currentUserStoryGroup ? currentUserStoryGroup.stories : [],
  };

  // Filter out the current user's group
  const feedStoryGroups = storyGroups.filter(
    (group) => group.username !== currentUserUsername
  );

  // Scroll Handlers
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative w-full border-b border-border/40 bg-bg-primary/50 backdrop-blur-sm pt-4 pb-2">

      {/* Scroll Controls (Visible on Desktop hover) */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10 hidden md:flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <button onClick={() => scroll('left')} className="p-1 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md">
          <IoChevronBack />
        </button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-10 hidden md:flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <button onClick={() => scroll('right')} className="p-1 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md">
          <IoChevronForward />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto px-4 pb-2 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* --- 1. Your Story Circle --- */}
        <div className="snap-start flex-shrink-0">
          <StoryCircle
            storyGroup={yourStoryData}
            isCurrentUser={true}
            onClick={onYourStoryClick}
          />
        </div>

        {/* --- 2. Other Users' Story Circles --- */}
        {feedStoryGroups.length > 0 ? (
          feedStoryGroups.map((group, index) => (
            <div key={group.username} className="snap-start flex-shrink-0">
              <StoryCircle
                storyGroup={group}
                onClick={() => onSelectStory(index)}
              />
            </div>
          ))
        ) : (
          // Subtle empty state integrated into the scroll flow
          <div className="flex items-center text-text-secondary text-sm px-2 mt-2">
            <span className="opacity-50">No recent stories</span>
          </div>
        )}

        {/* Spacing element at the end */}
        <div className="w-2 flex-shrink-0" />
      </div>
    </div>
  );
};

export default StoryCircleList;