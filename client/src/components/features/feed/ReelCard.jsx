import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaHeart, FaComment, FaShare, FaMusic, FaPlay, FaRegHeart, FaTrash, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { IoPaperPlaneOutline, IoEllipsisVertical } from 'react-icons/io5';
import { likeReel, deleteReel, registerReelView } from '../../../api/reelApi';
import { toggleFollow } from '../../../api/userApi';
import { motion, AnimatePresence } from 'framer-motion';
import ReelCommentDrawer from './ReelCommentDrawer';
import ShareReelModal from './ShareReelModal';
import ReelOverlay from './ReelOverlay';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';

const ReelCard = ({ reel, onReelDeleted }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Engagement State
  const [isLiked, setIsLiked] = useState(reel.is_liked);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false); // NEW STATE

  // ... (rest of state items like isFollowing, videoRef, etc... keep them!)
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef(new Audio());
  const [isMuted, setIsMuted] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    if (currentUser && reel.author === currentUser.id) {
      setIsOwner(true);
    }
  }, [currentUser, reel]);

  // ... (keep all useEffects exactly as they are)
  useEffect(() => {
    // Reset ref if component is reused for different reel (conceptually)
    // although `key={reel.id}` in parent usually prevents this.
    hasViewedRef.current = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => { });
          setIsPlaying(true);

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
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => videoRef.current && observer.unobserve(videoRef.current);
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

    const handlePlay = () => safePlayAudio();
    const handlePause = () => a.pause();

    const handleTimeUpdate = () => {
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
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
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
    <div className="relative w-full h-full bg-black snap-start overflow-hidden flex items-center justify-center">
      {/* Video */}
      <div
        className="absolute inset-0 cursor-pointer"
        onDoubleClick={handleDoubleTap}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={reel.video_file}
          className={`w-full h-full object-contain ${getFilterClass(metadata?.filter)}`}
          loop
          playsInline
          muted
        />

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
      </div>

      {/* Mute Button - Top Right */}
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

      {/* Right Sidebar Actions */}
      <div className="absolute right-2 bottom-12 z-40 flex flex-col items-center space-y-4 md:space-y-6 md:right-3">
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

        {/* Options (Only for owner) */}
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
            className="p-2 mt-2"
          >
            <IoEllipsisVertical className="text-2xl md:text-3xl text-white drop-shadow-lg" />
          </button>
        )}

        {/* Delete Option Dropdown */}
        <AnimatePresence>
          {isOwner && showOptions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-16 right-0 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden w-32"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="w-full px-4 py-3 text-left text-red-400 font-medium text-xs hover:bg-white/10"
              >
                <FaTrash className="inline mr-2" /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Music Disc */}
        <div className="mt-2 md:mt-4">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg animate-spin-slow">
              <img
                src={reel.author_profile_picture || '/default-avatar.png'}
                alt="Artist"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-600 p-0.5 rounded-full">
              <FaMusic className="text-white text-[10px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Caption & Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-30 pointer-events-none">
        <div className="max-w-full pointer-events-auto">
          {/* User Info */}
          <div className="flex items-center mb-3">
            <button onClick={navigateToProfile} className="flex items-center space-x-2">
              <img
                src={reel.author_profile_picture || '/default-avatar.png'}
                alt={reel.author_username}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white object-cover"
              />
              <div>
                <p className="text-white font-bold text-sm md:text-base drop-shadow-lg">
                  {reel.author_username}
                </p>
              </div>
            </button>

            {!isOwner && (
              <button
                onClick={handleFollow}
                className={`ml-3 px-3 py-1 rounded-full text-xs md:text-sm font-bold transition-all ${isFollowing
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-black'
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

      {/* Comment Drawer */}
      <ReelCommentDrawer
        reelId={reel.id}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
      />

      {/* Share Modal */}
      <ShareReelModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        reelId={reel.id}
      />
    </div>
  );
};

export default ReelCard;