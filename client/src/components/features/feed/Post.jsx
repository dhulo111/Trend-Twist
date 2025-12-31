// frontend/src/components/features/feed/Post.jsx

import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoHeartOutline, IoHeartSharp, IoChatbubbleOutline, IoEllipsisHorizontal, IoBookmarkOutline, IoBookmark } from 'react-icons/io5';
import { GiTwister } from 'react-icons/gi';
import { FaRegChartBar } from 'react-icons/fa';
import Avatar from '../../common/Avatar';
import { toggleLike, deletePost } from '../../../api/postApi';
import { AuthContext } from '../../../context/AuthContext';

/**
 * Renders a single post card in the feed, with enhanced Instagram-like functionality.
 */
const Post = ({ post, onUpdate }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const isAuthor = currentUser?.username === post.author_username;
  const isLiked = post.is_liked;
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for More Options menu
  const [isSaved, setIsSaved] = useState(false); // Mock state for Save/Bookmark

  // --- Utility Functions ---

  const formatTimeAgo = (dateString) => {
    // Simplified time format for clean UI
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  // Converts content text into clickable links for hashtags
  const renderContentWithHashtags = (content) => {
    const parts = content.split(/(\s#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith(' #')) {
        const hashtag = part.trim().substring(1);
        return (
          <Link
            key={index}
            to={`/trending?tag=${hashtag}`}
            className="text-text-accent hover:underline font-medium"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {part.trim()}
          </Link>
        );
      }
      return part;
    });
  };

  // --- Engagement Handlers ---

  const [localIsLiked, setLocalIsLiked] = useState(post.is_liked);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);

  // Sync if prop changes (e.g. from parent re-fetch)
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
      // Optional: if onUpdate is provided and does something lightweight, call it.
      // If it refetches everything, maybe skip it to avoid "flicker".
      // if (onUpdate) onUpdate(); 
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert if failed
      setLocalIsLiked(prevLiked);
      setLocalLikesCount(prev => prevLiked ? prev + 1 : prev - 1);
    }
  };

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
    <div className="w-full glass rounded-none sm:rounded-xl mb-8 transition-all duration-300 hover:shadow-2xl hover:border-text-accent/30 overflow-hidden">

      {/* --- 1. Post Header --- */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Link to={`/profile/${post.author_username}`} className="flex items-center space-x-3">
            <Avatar
              src={post.author_profile_picture}
              alt={post.author_username}
              size="md"
            />
            <div>
              <p className="font-semibold text-text-primary hover:text-text-accent transition-colors">
                {post.author_username}
              </p>
              <p className="text-xs text-text-secondary">
                {formatTimeAgo(post.created_at)} ago
              </p>
            </div>
          </Link>
        </div>

        {/* More Options / Analytics */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full"
          >
            <IoEllipsisHorizontal className="h-6 w-6" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-background-secondary shadow-xl z-10">
              {isAuthor && (
                <button
                  onClick={handleDelete}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              )}
              {isAuthor && (
                <Link
                  to={`/post/${post.id}/analytics`}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-background-accent transition-colors"
                >
                  <FaRegChartBar className="h-4 w-4" />
                  Analytics
                </Link>
              )}
              {!isAuthor && (
                <button
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-background-accent transition-colors"
                >
                  Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- 2. Post Media (Image/Video) --- */}
      {post.media_file && (
        <div className="relative w-full overflow-hidden border-t border-b border-border bg-background-primary">
          {post.media_file.endsWith('.mp4') || post.media_file.endsWith('.mov') ? (
            <video
              src={post.media_file}
              className="w-full object-cover max-h-[600px]"
              controls
              muted
              // Note: Loop is often true for short-form video feeds
              loop
            />
          ) : (
            <img
              src={post.media_file}
              alt="Post media"
              className="w-full object-cover max-h-[600px]"
            />
          )}
        </div>
      )}

      {/* --- 3. Content and Actions --- */}
      <div className="p-4">

        {/* Engagement Icons (Row 1) */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            {/* Like Button */}
            <button onClick={handleLike} className="text-text-primary transition-colors hover:text-red-500 focus:outline-none">
              {localIsLiked ? (
                <IoHeartSharp className="h-7 w-7 text-red-500" />
              ) : (
                <IoHeartOutline className="h-7 w-7" />
              )}
            </button>

            {/* Comment Button */}
            <Link to={`/post/${post.id}`} className="text-text-primary transition-colors hover:text-text-accent focus:outline-none">
              <IoChatbubbleOutline className="h-7 w-7" />
            </Link>

            {/* Twist Button */}
            <button onClick={handleTwist} className="text-text-primary transition-colors hover:text-yellow-500 focus:outline-none">
              <GiTwister className="h-7 w-7" />
            </button>
          </div>

          {/* Save/Bookmark Button */}
          <button onClick={handleSave} className="text-text-primary transition-colors hover:text-text-secondary focus:outline-none">
            {isSaved ? (
              <IoBookmark className="h-7 w-7" />
            ) : (
              <IoBookmarkOutline className="h-7 w-7" />
            )}
          </button>
        </div>

        {/* Likes and Counts (Row 2 - Compact Info) */}
        <div className="mt-3 text-sm font-semibold text-text-primary">
          {localLikesCount} likes • {post.twists_count} twists
        </div>

        {/* Post Caption (Row 3) */}
        <p className="mt-2 text-text-primary whitespace-pre-wrap text-sm">
          <Link to={`/profile/${post.author_username}`} className="font-bold hover:text-text-accent transition-colors mr-1">
            {post.author_username}
          </Link>
          {renderContentWithHashtags(post.content)}
        </p>

        {/* View Comments Link */}
        {post.comments_count > 0 && (
          <Link to={`/post/${post.id}`} className="mt-2 block text-sm text-text-secondary hover:text-text-accent transition-colors">
            View all {post.comments_count} comments
          </Link>
        )}
      </div>
    </div>
  );
};

export default Post;