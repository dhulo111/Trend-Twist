// frontend/src/components/features/feed/StoryViewerModal.jsx

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline, IoChevronBack, IoChevronForward, IoEyeOutline, IoTrashOutline, IoAddCircleOutline, IoMusicalNotes } from 'react-icons/io5';
import { registerView, deleteStory } from '../../../api/storyApi';
import { AuthContext } from '../../../context/AuthContext';
import Avatar from '../../common/Avatar';
import Spinner from '../../common/Spinner';
import StoryAnalyticsModal from './StoryAnalyticsModal';
import { useNavigate } from 'react-router-dom';
import Button from '../../common/Button';

/**
 * Full-screen modal component to view stories in sequence (Instagram Style).
 */
const StoryViewerModal = ({ isOpen, onClose, storyGroups, initialGroupIndex, onStoriesViewed, onOpenCreatorModal }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const totalGroups = storyGroups.length;
  const totalStoriesInGroup = currentGroup?.stories?.length || 0;

  const isOwner = currentUser?.username === currentGroup?.username;

  // Constants & Refs
  const STORY_DURATION_MS = 5000;
  const progressBarRefs = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null); // Reference for audio element

  // --- Reset on Open ---
  useEffect(() => {
    if (isOpen && storyGroups.length > 0) {
      const safeIndex = initialGroupIndex < totalGroups ? initialGroupIndex : 0;
      setCurrentGroupIndex(safeIndex);
      setCurrentStoryIndex(0);
      setIsPaused(false);
      setIsMediaLoaded(false);
    }
  }, [isOpen, initialGroupIndex, totalGroups]);

  // --- Navigation Handlers ---
  const handleNext = useCallback(() => {
    if (currentStoryIndex < totalStoriesInGroup - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setIsMediaLoaded(false);
    } else if (currentGroupIndex < totalGroups - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setIsMediaLoaded(false);
    } else {
      onClose();
      if (onStoriesViewed) onStoriesViewed();
    }
  }, [currentStoryIndex, currentGroupIndex, totalStoriesInGroup, totalGroups, onClose, onStoriesViewed]);

  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setIsMediaLoaded(false);
    } else if (currentGroupIndex > 0) {
      const prevGroupIndex = currentGroupIndex - 1;
      const prevGroup = storyGroups[prevGroupIndex];
      setCurrentGroupIndex(prevGroupIndex);
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setIsMediaLoaded(false);
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups]);

  // --- Timer and Auto-Advance Logic (Main Effect) ---
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || !isMediaLoaded || isAnalyticsOpen || isDeleting) {
      clearTimeout(timerRef.current);
      if (progressBarRefs.current[currentStoryIndex]) {
        progressBarRefs.current[currentStoryIndex].style.animationPlayState = 'paused';
      }

      // Pause Audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }

      return;
    }

    // Resume/Start Audio
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play prevented", e));
    }

    if (progressBarRefs.current[currentStoryIndex]) {
      progressBarRefs.current[currentStoryIndex].style.animationPlayState = 'running';
    }

    // Register view for the story (Only if not owner)
    if (!isOwner) {
      registerView(currentStory.id);
    }

    timerRef.current = setTimeout(() => {
      handleNext();
    }, (currentStory.duration || 5) * 1000);

    return () => clearTimeout(timerRef.current);
  }, [currentStory, isOpen, isPaused, isMediaLoaded, handleNext, currentStoryIndex, isOwner, isAnalyticsOpen, isDeleting]);

  // --- Progress Bar Animation Logic ---
  const getProgressStyles = (index) => {
    if (index < currentStoryIndex) {
      return { width: '100%', transition: 'none' };
    }
    if (index === currentStoryIndex) {
      return {
        width: '100%',
        transition: isMediaLoaded ? `width ${(currentStory.duration || 5) * 1000}ms linear` : 'none',
        animationPlayState: isPaused ? 'paused' : 'running',
      };
    }
    return { width: '0%', transition: 'none' };
  };

  // --- Delete Handler ---
  const handleDeleteStory = async (e) => {
    e.stopPropagation(); // Prevent modal from pausing/closing
    if (!window.confirm("Are you sure you want to delete this story?")) return;

    setIsDeleting(true);
    try {
      await deleteStory(currentStory.id);
      setIsDeleting(false);
      handleNext();
    } catch (error) {
      setIsDeleting(false);
      alert("Failed to delete story.");
    }
  };

  if (!isOpen || !currentGroup || !currentStory) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >


          {/* --- Story Content Area --- */}
          <div className="relative w-full max-w-lg h-full md:h-[90vh] md:max-h-[900px] overflow-hidden rounded-lg shadow-2xl bg-black">

            {/* --- Progress Bars (Timeline) --- */}
            <div className="absolute top-0 left-0 right-0 z-40 flex space-x-1 p-2">
              {currentGroup.stories.map((story, index) => (
                <div key={story.id} className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden">
                  <motion.div
                    ref={el => progressBarRefs.current[index] = el}
                    className="h-full bg-white"
                    initial={false}
                    animate={getProgressStyles(index)}
                  />
                </div>
              ))}
            </div>

            {/* --- Story Header (User Info & Analytics Button) --- */}
            <div className="absolute top-6 left-3 right-3 z-40 flex items-center justify-between">
              <div className="flex items-center space-x-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <Avatar src={currentGroup.profile_picture} size="sm" />
                <p className="font-semibold text-white">
                  {currentGroup.username}
                  <span className="ml-2 text-xs font-normal text-white/70">
                    {new Date(currentStory.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>

              <div className='flex items-center space-x-2 pointer-events-auto'>
                {/* --- Analytics Button (ONLY Owner) --- */}
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsAnalyticsOpen(true); }}
                    className="p-1 rounded-full text-white/70 hover:text-white transition-colors bg-black/20"
                    title="View Story Views"
                  >
                    <IoEyeOutline className="h-6 w-6" />
                  </button>
                )}
                {/* --- Delete Button (ONLY Owner) --- */}
                {isOwner && (
                  <button
                    onClick={handleDeleteStory}
                    className="p-1 rounded-full text-white/70 hover:text-red-500 transition-colors bg-black/20"
                    title="Delete Story"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Spinner size="sm" className="text-red-500" /> : <IoTrashOutline className="h-6 w-6" />}
                  </button>
                )}

                {/* --- Close Button (Always Visible) --- */}
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-white hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <IoCloseOutline className="h-8 w-8 drop-shadow-md" />
                </button>
              </div>
            </div>

            {/* --- Music Badge (If Music Exists) --- */}
            {currentStory.music_title && (
              <div className="absolute top-16 left-4 z-40 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 animate-fade-in pointer-events-none">
                <IoMusicalNotes className="text-cyan-400 animate-pulse text-sm" />
                <span className="text-white text-xs font-bold shadow-black drop-shadow-md">{currentStory.music_title}</span>
              </div>
            )}

            {/* --- Navigation Buttons (Clickable areas) --- */}
            <div className="absolute inset-0 z-30 flex items-center justify-between">
              <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
              <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
            </div>

            {/* --- Main Media Content --- */}
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              {!isMediaLoaded && (
                <div className='absolute'><Spinner size="lg" className='text-white' /></div>
              )}

              {/* Audio Element */}
              {currentStory.music_file && (
                <audio
                  ref={audioRef}
                  src={currentStory.music_file}
                  loop
                  muted={false}
                  playsInline
                />
              )}

              <motion.div
                key={currentStory.id}
                initial={{ scale: 0.95, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0.5 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-center"
              >
                {currentStory.media_file?.endsWith('.mp4') || currentStory.media_file?.endsWith('.mov') ? (
                  <video
                    src={currentStory.media_file}
                    className={`max-w-full max-h-full object-contain ${isMediaLoaded ? '' : 'hidden'}`}
                    autoPlay
                    muted={!!currentStory.music_file} // Mute video if external music is playing
                    playsInline
                    onLoadedData={() => setIsMediaLoaded(true)}
                    onError={() => setIsMediaLoaded(true)}
                    loop
                  />
                ) : (
                  <img
                    src={currentStory.media_file}
                    alt="Story Content"
                    className={`max-w-full max-h-full object-contain ${isMediaLoaded ? '' : 'hidden'}`}
                    onLoad={() => setIsMediaLoaded(true)}
                    onError={() => setIsMediaLoaded(true)}
                  />
                )}
              </motion.div>

            

            </div>

            {/* --- Send Message / Add New Story --- */}
            <div className="absolute bottom-0 left-0 right-0 z-40 p-4 pointer-events-auto">
              {isOwner ? (
                // Owner option: Add New Story button
                <Button
                  onClick={() => navigate('create/story')}
                  className='w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white'
                >
                  <IoAddCircleOutline className='h-6 w-6' />
                  <span>Add New Story</span>
                </Button>
              ) : (
                // Viewer option: Reply Input
                <input
                  type="text"
                  placeholder="Send Message"
                  className="w-full rounded-full bg-white/20 px-4 py-3 text-white placeholder-white/80 focus:outline-none backdrop-blur-sm border border-white/30"
                  disabled={isPaused}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Render the Analytics Modal --- */}
      <StoryAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        storyId={currentStory?.id}
      />
    </AnimatePresence>
  );
};

export default StoryViewerModal;