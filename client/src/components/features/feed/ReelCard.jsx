import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaHeart, FaComment, FaShare, FaMusic, FaPlay, FaRegHeart, FaTrash, FaVolumeUp, FaVolumeMute, FaRegBookmark, FaBookmark, FaLock } from 'react-icons/fa';
import { IoPaperPlaneOutline, IoEllipsisVertical } from 'react-icons/io5';
import { likeReel, deleteReel, registerReelView } from '../../../api/reelApi';
import { toggleFollow, toggleSave } from '../../../api/userApi';
import { motion, AnimatePresence } from 'framer-motion';
import ReelCommentDrawer from './ReelCommentDrawer';
import ShareReelModal from './ShareReelModal';
import ReelOverlay from './ReelOverlay';
import ReportModal from '../../common/ReportModal';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import Avatar from '../../common/Avatar';
import TierBadge from '../../common/TierBadge';

const ReelCard = ({ reel, onReelDeleted, onVisible }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Engagement State
  const [isLiked, setIsLiked] = useState(reel.is_liked);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false); // NEW STATE
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(reel.is_saved);

  useEffect(() => {
    setIsSaved(reel.is_saved);
  }, [reel.is_saved]);

  // ... (rest of state items like isFollowing, videoRef, etc... keep them!)
  const [isFollowing, setIsFollowing] = useState(reel.is_following || false);
  const [isOwner, setIsOwner] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef(new Audio());
  const [isMuted, setIsMuted] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    if (currentUser && reel.author === currentUser.id) {
      setIsOwner(true);
    }
  }, [currentUser, reel]);

  // ... (keep all useEffects exactly as they are)
  useEffect(() => {
    setIsFollowing(reel.is_following || false);
  }, [reel.is_following]);

  useEffect(() => {
    // Reset ref if component is reused for different reel (conceptually)
    // although `key={reel.id}` in parent usually prevents this.
    hasViewedRef.current = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          if (onVisible) onVisible(reel.id); // Notify parent this reel is in view
          
          if (reel.media_type === 'video') {
            const playPromise = videoRef.current?.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                setIsPlaying(true);
              }).catch(() => {
                setIsPlaying(false);
              });
            }
          } else {
            setIsPlaying(true); // Always "playing" for images
          }

          if (!hasViewedRef.current) {
            hasViewedRef.current = true; // Mark immediately synchronously

            // Don't count own views
            const isAhthor = currentUser && (currentUser.id === reel.author || currentUser.username === reel.author_username);
            if (!isAhthor) {
              registerReelView(reel.id).catch(e => console.error("View count error", e));
            }
          }

        } else {
          videoRef.current?.pause();
          audioRef.current?.pause();
          setIsPlaying(false);
          setProgress(0);
        }
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => containerRef.current && observer.unobserve(containerRef.current);
  }, [reel.id]);

  useEffect(() => {
    if (reel.editor_json) {
      try {
        const data = typeof reel.editor_json === 'string' ? JSON.parse(reel.editor_json) : reel.editor_json;
        setMetadata(data);

        if (data.music && data.music.previewUrl) {
          audioRef.current.src = data.music.previewUrl;
          audioRef.current.volume = 0.7;
          audioRef.current.loop = true;
        }
      } catch (e) {
        console.error("Failed to parse editor metadata", e);
      }
    }
  }, [reel]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    if (videoRef.current) {
      videoRef.current.muted = !!metadata?.music || isMuted;
    }
  }, [isMuted, metadata]);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    const safePlayAudio = () => {
      if (metadata?.music && a.paused) {
        a.play().catch(() => { });
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      safePlayAudio();
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      a.pause();
    };

    const handleTimeUpdate = () => {
      if (v.duration) {
        if (metadata?.trim) {
          const { start, end } = metadata.trim;
          if (v.currentTime < start) v.currentTime = start;
          if (v.currentTime >= end) {
            v.currentTime = start;
            if (metadata.music) {
              a.currentTime = 0;
              safePlayAudio();
            }
            v.play().catch(() => { });
          }
          setProgress(((v.currentTime - start) / (end - start)) * 100);
        } else {
          setProgress((v.currentTime / v.duration) * 100);
        }
      }
    };

    if (v) {
      v.addEventListener('play', handlePlay);
      v.addEventListener('pause', handlePause);
      v.addEventListener('timeupdate', handleTimeUpdate);
      if (!v.paused) safePlayAudio();
    }

    return () => {
      if (v) {
        v.removeEventListener('play', handlePlay);
        v.removeEventListener('pause', handlePause);
        v.removeEventListener('timeupdate', handleTimeUpdate);
      }
      a.pause();
    };
  }, [metadata]);
  
  // Simulated Progress for Images
  useEffect(() => {
    let interval;
    if (isVisible && isPlaying && reel.media_type === 'image') {
      const duration = reel.duration || 15;
      const step = 100; // ms
      const increment = (step / (duration * 1000)) * 100;
      
      // Start audio if any
      if (metadata?.music && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }

      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Loop audio
            if (metadata?.music) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
            return 0;
          }
          return prev + increment;
        });
      }, step);
    } else {
      if (reel.media_type === 'image' && !isPlaying) {
        audioRef.current.pause();
      }
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isVisible, isPlaying, reel.media_type, reel.duration, metadata]);

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (!isLiked) handleLike();
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 800);
  };

  const handleLike = async () => {
    const previousState = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      await likeReel(reel.id);
    } catch (error) {
      console.error("Error liking reel:", error);
      setIsLiked(previousState);
      setLikesCount(prev => previousState ? prev + 1 : prev - 1);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);
    try {
      await toggleSave('reel', reel.id);
    } catch (error) {
      console.error("Error saving reel:", error);
      setIsSaved(prevSaved);
    }
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    try {
      await toggleFollow(reel.author);
    } catch (error) {
      console.error("Follow failed", error);
      setIsFollowing(prev => !prev);
    }
  };

  const navigateToProfile = (e) => {
    e.stopPropagation();
    navigate(`/profile/${reel.author_username}`);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this reel?")) {
      try {
        await deleteReel(reel.id);
        if (onReelDeleted) onReelDeleted(reel.id);
      } catch (e) {
        console.error("Delete failed", e);
        alert("Failed to delete reel.");
      }
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    if (reel.media_type === 'video') {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    } else {
      // Toggle "play" state for images
      setIsPlaying(!isPlaying);
    }
  };

  const getFilterClass = (type) => {
    switch (type) {
      case 'vintage': return 'sepia contrast-125 brightness-90';
      case 'bw': return 'grayscale contrast-125';
      case 'warm': return 'sepia-[0.4] brightness-105';
      case 'cool': return 'hue-rotate-180 sepia-[0.2] brightness-105';
      case 'technicolor': return 'saturate-150 contrast-120';
      default: return '';
    }
  };

  return (
    <div className="relative w-full h-full bg-black snap-start flex md:flex-row flex-col items-center justify-center md:bg-transparent">
      {/* Video Container */}
      <div 
        ref={containerRef}
        className="relative w-full h-full md:w-[380px] md:h-[calc(100vh-80px)] md:max-h-[850px] md:rounded-xl overflow-hidden bg-black flex-shrink-0 shadow-none md:shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      >
        {/* Video */}
        <div
          className="absolute inset-0 cursor-pointer"
          onDoubleClick={handleDoubleTap}
          onClick={togglePlay}
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 z-50 flex gap-0.5 px-1 pt-1 opacity-80">
            <div className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-100 ease-linear"
                 style={{ width: `${progress}%` }}
               />
            </div>
          </div>
        {/* Video or Locked Overlay */}
        {reel.has_access === false ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-2xl px-6 text-center">
            <FaLock className="text-white text-6xl mb-6 shadow-2xl" />
            <h3 className="text-white text-2xl font-black mb-2 tracking-tight">Premium Reel</h3>
            <p className="text-white/70 text-sm mb-8 max-w-[280px]">
              {reel.caption || "Subscribe to unlock this exclusive content."}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${reel.author_username}/subscribe`); }}
              className="w-full max-w-[240px] bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
            >
              Subscribe
            </button>
          </div>
        ) : reel.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={reel.media_file}
            className={`w-full h-full object-contain ${getFilterClass(metadata?.filter)}`}
            loop
            playsInline
            muted
          />
        ) : (
          <img
            src={reel.media_file}
            className={`w-full h-full object-contain ${getFilterClass(metadata?.filter)}`}
            alt={reel.caption}
          />
        )}

        {/* Editor Overlays (Text, Stickers) */}
        {reel.editor_json && (
          <div className="absolute inset-0 pointer-events-none">
            <ReelOverlay editorJson={reel.editor_json} />
          </div>
        )}

        {/* Double Tap Heart */}
        <AnimatePresence>
          {showHeartOverlay && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <FaHeart className="text-white text-9xl drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
            <div className="bg-black/50 p-6 rounded-full">
              <FaPlay className="text-white text-5xl ml-2" />
            </div>
          </div>
        )}
      </div> {/* End Click Overlay */}

      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-40 bg-black/40 backdrop-blur-md p-2 md:p-3 rounded-full"
      >
        {isMuted ? (
          <FaVolumeMute className="text-white text-lg md:text-xl" />
        ) : (
          <FaVolumeUp className="text-white text-lg md:text-xl" />
        )}
      </button>

      {/* Bottom Caption & Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-30 pointer-events-none">
        <div className="max-w-full pointer-events-auto">
          {/* User Info */}
          <div className="flex items-center mb-3">
            <button onClick={navigateToProfile} className="flex items-center space-x-2">
              <Avatar
                src={reel.author_profile_picture}
                alt={reel.author_username}
                size="sm"
                className="border border-white"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-sm md:text-base drop-shadow-lg">
                    {reel.author_username}
                  </p>
                  {reel.is_exclusive && reel.required_tier && (
                    <TierBadge tier={reel.required_tier} />
                  )}
                </div>
              </div>
            </button>

            {!isOwner && (
              <button
                onClick={handleFollow}
                className={`ml-3 px-4 py-1 rounded-full text-xs md:text-sm font-bold transition-all duration-300 shadow hover:shadow-lg active:scale-95 ${
                  isFollowing
                    ? 'bg-transparent border border-white/40 text-white hover:bg-white/10'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border border-transparent hover:scale-105'
                  }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Caption */}
          {reel.caption && (
            <p className="text-white text-sm leading-relaxed mb-3 drop-shadow-lg line-clamp-2">
              {reel.caption}
            </p>
          )}

          {/* Music Ticker */}
          <div className="flex items-center space-x-2">
            <FaMusic className="text-white text-sm" />
            <div className="overflow-hidden max-w-[70vw]">
              <p className="text-white text-sm font-medium truncate animate-marquee-inline">
                {reel.music_name || 'Original audio'} • {reel.author_username}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

      {/* Right Sidebar Actions (Mobile Only) */}
      <div className="absolute right-2 bottom-12 z-40 flex flex-col items-center space-y-4 md:hidden">
        {/* Like */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-2">
            {isLiked ? (
              <FaHeart className="text-2xl md:text-3xl text-red-500 drop-shadow-lg" />
            ) : (
              <FaRegHeart className="text-2xl md:text-3xl text-white drop-shadow-lg" />
            )}
          </button>
          <span className="text-white text-xs md:text-sm font-semibold drop-shadow-md">
            {likesCount.toLocaleString()}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={(e) => { e.stopPropagation(); setIsCommentOpen(true); }} className="p-2">
            <FaComment className="text-2xl md:text-3xl text-white drop-shadow-lg scale-x-[-1]" />
          </button>
          <span className="text-white text-xs md:text-sm font-semibold drop-shadow-md">
            {reel.comments_count}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="p-2">
            <IoPaperPlaneOutline className="text-2xl md:text-3xl text-white drop-shadow-lg rotate-[-30deg]" />
          </button>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={handleSave} className="p-2">
            {isSaved ? (
              <FaBookmark className="text-2xl md:text-3xl text-white drop-shadow-lg" />
            ) : (
              <FaRegBookmark className="text-2xl md:text-3xl text-white drop-shadow-lg" />
            )}
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col items-center space-y-1">
          <button
            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
            className="p-2 mt-2"
          >
            <IoEllipsisVertical className="text-2xl md:text-3xl text-white drop-shadow-lg" />
          </button>
        </div>

        {/* Options Dropdown */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-32 right-12 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden w-36 z-50"
            >
              {isOwner ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); setShowOptions(false); }}
                  className="w-full px-4 py-3 text-left text-red-400 font-medium text-xs hover:bg-white/10"
                >
                  <FaTrash className="inline mr-2" /> Delete
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOptions(false); setIsReportOpen(true); }}
                  className="w-full px-4 py-3 text-left text-white font-medium text-xs hover:bg-white/10"
                >
                  Report Reel
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Music Disc */}
        <div className="mt-2 md:mt-4">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg animate-spin-slow">
              <Avatar
                src={reel.author_profile_picture}
                alt="Artist"
                size="md"
                className="w-full h-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-600 p-0.5 rounded-full">
              <FaMusic className="text-white text-[10px]" />
            </div>
          </div>
        </div>
      </div> {/* End Mobile Sidebar */}
      
      </div> {/* End Video Container (containerRef) */}

      {/* Right Sidebar Actions (Desktop Only) */}
      <div className="hidden md:flex flex-col items-center space-y-4 md:space-y-6 ml-4 self-end mb-4">
        {/* Like */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="bg-gray-800/80 hover:bg-gray-700 p-3 rounded-full transition-colors flex items-center justify-center w-12 h-12">
            {isLiked ? (
              <FaHeart className="text-xl text-red-500" />
            ) : (
              <FaRegHeart className="text-xl text-white" />
            )}
          </button>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {likesCount.toLocaleString()}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={(e) => { e.stopPropagation(); setIsCommentOpen(true); }} className="bg-gray-800/80 hover:bg-gray-700 p-3 rounded-full transition-colors flex items-center justify-center w-12 h-12">
            <FaComment className="text-xl text-white scale-x-[-1]" />
          </button>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {reel.comments_count}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="bg-gray-800/80 hover:bg-gray-700 p-3 rounded-full transition-colors flex items-center justify-center w-12 h-12">
            <IoPaperPlaneOutline className="text-xl text-white rotate-[-30deg]" />
          </button>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center space-y-1">
          <button onClick={handleSave} className="bg-gray-800/80 hover:bg-gray-700 p-3 rounded-full transition-colors flex items-center justify-center w-12 h-12">
            {isSaved ? (
              <FaBookmark className="text-xl text-white" />
            ) : (
              <FaRegBookmark className="text-xl text-white" />
            )}
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col items-center space-y-1 relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
            className="bg-gray-800/80 hover:bg-gray-700 p-3 rounded-full transition-colors flex items-center justify-center w-12 h-12 mt-2"
          >
            <IoEllipsisVertical className="text-xl text-white" />
          </button>
          
          {/* Options Dropdown for Desktop */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute right-14 top-0 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-36 z-50 shadow-2xl"
              >
                {isOwner ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-red-500 font-medium text-xs hover:bg-gray-800 transition-colors"
                  >
                    <FaTrash className="inline mr-2" /> Delete
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowOptions(false); setIsReportOpen(true); }}
                    className="w-full px-4 py-3 text-left text-white font-medium text-xs hover:bg-gray-800 transition-colors"
                  >
                    Report Reel
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Music Disc */}
        <div className="mt-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg animate-spin-slow">
              <Avatar
                src={reel.author_profile_picture}
                alt="Artist"
                size="md"
                className="w-full h-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-600 p-0.5 rounded-full">
              <FaMusic className="text-white text-[10px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Comment Drawer */}
      <ReelCommentDrawer
        reelId={reel.id}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
      />

      <ShareReelModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        reelId={reel.id}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportedUserId={reel.author}
        contextData={{ reel: reel.id }}
      />
    </div>
  );
};

export default ReelCard;