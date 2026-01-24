
import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import Avatar from '../../common/Avatar';
import {
  IoChatbubbleOutline,
  IoHeartOutline,
  IoHeartSharp,
  IoRepeatOutline,
  IoShareOutline,
  IoStatsChart,
  IoEllipsisHorizontal
} from 'react-icons/io5';
import { toggleTwistLike, deleteTwist } from '../../../api/postApi';
import { motion, AnimatePresence } from 'framer-motion';

const TwistCard = ({ post, onUpdate }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthor = currentUser?.username === post.author_username;

  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleLike = async (e) => {
    e.stopPropagation();

    // 1. Optimistic Update
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);

    try {
      // 2. API Call
      await toggleTwistLike(post.id);
    } catch (error) {
      console.error("Like failed", error);
      // 3. Rollback on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm("Delete this twist?")) {
      await deleteTwist(post.id);
      if (onUpdate) onUpdate();
    }
  };

  const navigateToDetail = () => {
    navigate(`/twists/${post.id}`);
  };

  return (
    <article
      onClick={navigateToDetail}
      className="flex gap-3 p-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer"
    >
      {/* Left: Avatar */}
      <div className="flex-shrink-0">
        <Link to={`/profile/${post.author_username}`} onClick={e => e.stopPropagation()}>
          <Avatar src={post.author_profile_picture} alt={post.author_username} size="md" />
        </Link>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0">

        {/* Header: Name, Username, Time, More */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden text-sm">
            <Link to={`/profile/${post.author_username}`} onClick={e => e.stopPropagation()} className="font-bold text-white hover:underline truncate">
              {post.author.first_name ? `${post.author.first_name} ${post.author.last_name}` : post.author_username}
            </Link>
            <span className="text-gray-500 truncate">@{post.author_username}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 hover:underline">{formatTime(post.created_at)}</span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-full transition-colors"
            >
              <IoEllipsisHorizontal size={18} />
            </button>
            {/* Simple Dropdown */}
            {isMenuOpen && isAuthor && (
              <div className="absolute right-0 top-6 w-32 bg-black border border-white/10 shadow-xl rounded-lg z-10 py-1">
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-white/5 text-sm font-bold"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Text Content */}
        {post.content && (
          <div className="mt-1 text-white text-[15px] leading-relaxed whitespace-pre-wrap">
            {post.content.split(' ').map((word, i) =>
              word.startsWith('#') ? <span key={i} className="text-accent">{word} </span> : word + ' '
            )}
          </div>
        )}

        {/* Media Attachment */}
        {post.media_file && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 max-h-[500px]">
            {post.media_file.endsWith('.mp4') ? (
              <video src={post.media_file} controls className="w-full h-full object-cover" onClick={e => e.stopPropagation()} />
            ) : (
              <img src={post.media_file} alt="Post media" className="w-full h-full object-cover" />
            )}
          </div>
        )}

        {/* Footer Actions (Twitter-style) */}
        <div className="flex items-center justify-between mt-3 text-gray-500 max-w-md">
         

          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-600' : 'hover:text-pink-600'}`}
          >
            <div className="p-2 rounded-full group-hover:bg-pink-600/10">
              {isLiked ? <IoHeartSharp size={18} /> : <IoHeartOutline size={18} />}
            </div>
            <span className="text-xs group-hover:text-pink-600">{likesCount || 0}</span>
          </button>
        </div>

      </div>
    </article>
  );
};

export default TwistCard;
