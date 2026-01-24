import React, { useContext, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IoHeartOutline,
  IoHeartSharp,
  IoChatbubbleOutline,
  IoEllipsisHorizontal,
  IoBookmarkOutline,
  IoBookmark,
  IoPaperPlaneOutline
} from 'react-icons/io5';
import { GiTwister } from 'react-icons/gi';
import { FaRegChartBar } from 'react-icons/fa';
import Avatar from '../../common/Avatar';
import { toggleLike, deletePost } from '../../../api/postApi';
import { AuthContext } from '../../../context/AuthContext';
import SharePostModal from './SharePostModal';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Renders a single post card in the feed, with enhanced Instagram-like functionality.
 */
const Post = ({ post, onUpdate }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const isAuthor = currentUser?.username === post.author_username;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false); // Mock state for Save/Bookmark
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Double tap like state
  const [showBigHeart, setShowBigHeart] = useState(false);
  const lastTap = useRef(0);

  // --- Utility Functions ---

  const formatTimeAgo = (dateString) => {
    // Simplified time format for clean UI
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  // Converts content text into clickable links for hashtags
  const renderContentWithHashtags = (content) => {
    if (!content) return null;
    const parts = content.split(/(\s#\w+)/g);
    return parts.map((part, index) => {
      // Check if part is hashtag (naive check)
      if (part.trim().startsWith('#')) {
        const hashtag = part.trim().substring(1);
        return (
          <Link
            key={index}
            to={`/trending?tag=${hashtag}`}
            className="text-blue-400 hover:underline font-medium"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  // --- Engagement Handlers ---

  const [localIsLiked, setLocalIsLiked] = useState(post.is_liked);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);

  // Sync if prop changes
  React.useEffect(() => {
    setLocalIsLiked(post.is_liked);
    setLocalLikesCount(post.likes_count);
  }, [post.is_liked, post.likes_count]);

  const handleLike = async () => {
    // 1. Optimistic Update
    const prevLiked = localIsLiked;
    setLocalIsLiked(!prevLiked);
    setLocalLikesCount(prev => prevLiked ? prev - 1 : prev + 1);

    try {
      await toggleLike(post.id);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert if failed
      setLocalIsLiked(prevLiked);
      setLocalLikesCount(prev => prevLiked ? prev + 1 : prev - 1);
    }
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 1000);

      if (!localIsLiked) {
        handleLike();
      }
    }
    lastTap.current = now;
  };

  // Also support clicking media directly for double tap simulation if preferred,
  // but usually single click is to view or ignored. We'll stick to standard double click handler for desktop,
  // and touch logic for mobile if needed. For now, onDoubleClick works for React web.

  const handleTwist = () => {
    navigate(`/post/${post.id}`, { state: { openTwist: true } });
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(post.id);
        if (onUpdate) {
          onUpdate();
        }
      } catch (e) {
        alert("Failed to delete post. Permission denied.");
      }
    }
  }

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Call API to save post
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full relative group glass bg-black/40 border border-white/5 rounded-2xl mb-6 overflow-hidden hover:border-white/10 transition-colors"
      >

        {/* --- 1. Post Header --- */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent">
          <div className="flex items-center space-x-3">
            <Link to={`/profile/${post.author_username}`} className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-pink-500 to-yellow-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-[2px] bg-black rounded-full">
                <Avatar
                  src={post.author_profile_picture}
                  alt={post.author_username}
                  size="md"
                  className="rounded-full border-2 border-black"
                />
              </div>
            </Link>
            <div>
              <Link to={`/profile/${post.author_username}`} className="font-bold text-white hover:text-gray-200 transition-colors">
                {post.author_username}
              </Link>
              <div className="text-xs text-gray-400">
                {post.location && <span>{post.location} • </span>}
                {formatTimeAgo(post.created_at)}
              </div>
            </div>
          </div>

          {/* More Options */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <IoEllipsisHorizontal className="h-5 w-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#1A1A1A] shadow-2xl z-20 overflow-hidden"
                >
                  {isAuthor ? (
                    <>
                      <button
                        onClick={handleDelete}
                        className="flex items-center space-x-2 w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <span>Delete Post</span>
                      </button>
                      <Link
                        to={`/post/${post.id}/analytics`}
                        className="flex items-center space-x-2 w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <FaRegChartBar className="h-4 w-4" />
                        <span>Analytics</span>
                      </Link>
                    </>
                  ) : (
                    <button
                      className="flex items-center space-x-2 w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-white/5 transition-colors"
                    >
                      <span>Report Post</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- 2. Post Media --- */}
        <div
          className="relative w-full bg-black aspect-[4/5] sm:aspect-square flex items-center justify-center overflow-hidden cursor-pointer"
          onDoubleClick={handleDoubleTap}
        >
          {post.media_file ? (
            post.media_file.endsWith('.mp4') || post.media_file.endsWith('.mov') ? (
              <video
                src={post.media_file}
                className="w-full h-full object-cover"
                controls
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={post.media_file}
                alt="Post media"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center text-gray-500">
              No Media
            </div>
          )}

          {/* Big Heart Animation */}
          <AnimatePresence>
            {showBigHeart && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <IoHeartSharp className="text-white drop-shadow-2xl h-32 w-32 filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- 3. Content and Actions --- */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={handleLike}
                className={`focus:outline-none transition-colors ${localIsLiked ? 'text-red-500' : 'text-white hover:text-gray-300'}`}
              >
                {localIsLiked ? <IoHeartSharp size={26} /> : <IoHeartOutline size={26} />}
              </motion.button>

              <Link to={`/post/${post.id}`} className="text-white hover:text-gray-300 transition-colors">
                <IoChatbubbleOutline size={24} className="-rotate-90" style={{ transform: 'scaleX(-1)' }} />
              </Link>

              {/* Share Button (Reels Share Option) */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="text-white hover:text-gray-300 transition-colors"
                title="Share Post"
              >
                <IoPaperPlaneOutline size={24} className="-translate-y-[1px]" />
              </button>

            </div>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleSave}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isSaved ? <IoBookmark size={26} /> : <IoBookmarkOutline size={26} />}
            </motion.button>
          </div>

          {/* Likes */}
          <div className="mb-2">
            <p className="font-semibold text-white text-sm">
              {localLikesCount.toLocaleString()} likes
            </p>
          </div>

          {/* Caption */}
          <div className="mb-2">
            <span className="font-bold text-white mr-2">{post.author_username}</span>
            <span className="text-gray-300 text-sm whitespace-pre-wrap">
              {renderContentWithHashtags(post.content)}
            </span>
          </div>

          {/* Comments Preview */}
          {post.comments_count > 0 && (
            <Link
              to={`/post/${post.id}`}
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors block mt-2"
            >
              View all {post.comments_count} comments
            </Link>
          )}

          {/* Add a comment input simplified */}
          <div className="mt-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden">
              <Avatar src={currentUser?.profile?.profile_picture} size="xs" />
            </div>
            <Link to={`/post/${post.id}`} className="text-gray-500 text-sm flex-1 cursor-text">
              Add a comment...
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <SharePostModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            postId={post.id}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Post;