
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

import ShareTwistModal from './ShareTwistModal';

const TwistCard = ({ post, onUpdate }) => {
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthor = currentUser?.username === post.author_username;

  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);

    try {
      await toggleTwistLike(post.id);
    } catch (error) {
      console.error("Like failed", error);
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
    <>
      <article
        onClick={navigateToDetail}
        className="flex gap-4 p-5 border-b border-border hover:bg-background-accent/5 transition-all duration-200 cursor-pointer"
      >
        {/* Left: Avatar */}
        <div className="flex-shrink-0 pt-1">
          <Link to={`/profile/${post.author_username}`} onClick={e => e.stopPropagation()}>
            <Avatar src={post.author_profile_picture} alt={post.author_username} size="md" />
          </Link>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0">

          {/* Header: Name, Username, Time */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 overflow-hidden text-[15px]">
              <Link to={`/profile/${post.author_username}`} onClick={e => e.stopPropagation()} className="font-bold text-text-primary hover:underline truncate">
                {post.author.first_name ? `${post.author.first_name} ${post.author.last_name}` : post.author_username}
              </Link>
              <span className="text-text-secondary truncate text-sm">@{post.author_username}</span>
              <span className="text-text-secondary text-xs">•</span>
              <span className="text-text-secondary hover:underline text-sm">{formatTime(post.created_at)}</span>
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="p-2 text-text-secondary hover:text-text-accent hover:bg-text-accent/10 rounded-full transition-colors"
              >
                <IoEllipsisHorizontal size={18} />
              </button>
              {isMenuOpen && isAuthor && (
                <div className="absolute right-0 top-8 w-32 bg-background-secondary border border-border shadow-xl rounded-xl z-20 py-1 overflow-hidden">
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-white/5 text-sm font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Text Content */}
          {post.content && (
            <div className="mb-3 text-text-primary text-[15px] leading-relaxed whitespace-pre-wrap font-normal">
              {post.content.split(' ').map((word, i) =>
                word.startsWith('#') ? <span key={i} className="text-text-accent font-medium">{word} </span> : word + ' '
              )}
            </div>
          )}

          {/* Quoted Post (Twist) */}
          {post.original_post_data && (
            <Link
              to={`/post/${post.original_post_data.id}`}
              onClick={e => e.stopPropagation()}
              className="block mt-2 rounded-2xl border border-border overflow-hidden bg-background-primary/30 hover:bg-background-primary/50 hover:border-text-secondary/30 transition-all duration-200 group relative"
            >
              {/* Quote Indicator Strip (Optional, pure aesthetic) */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-text-secondary/20 group-hover:bg-text-accent transition-colors"></div>

              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 flex-shrink-0 rounded-full overflow-hidden">
                    <Avatar src={post.original_post_data.author_profile_picture} size="xs" />
                  </div>
                  <span className="font-bold text-text-primary text-[15px] hover:underline truncate">{post.original_post_data.author_username}</span>
                  <span className="text-text-secondary text-[13px]">• {formatTime(post.original_post_data.created_at)}</span>
                </div>
                {post.original_post_data.content && (
                  <p className="text-text-primary text-[15px] leading-normal mb-2">{post.original_post_data.content}</p>
                )}
              </div>

              {post.original_post_data.media_file && (
                <div className="h-56 w-full relative bg-background-secondary/50 border-t border-border/50">
                  {/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(post.original_post_data.media_file) ? (
                    <video src={post.original_post_data.media_file} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <img src={post.original_post_data.media_file} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Quoted media" />
                  )}
                </div>
              )}
            </Link>
          )}

          {/* Main Media Attachment */}
          {post.media_file && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border shadow-sm max-h-[600px]">
              {/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(post.media_file) ? (
                <video
                  src={post.media_file}
                  controls
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <img src={post.media_file} alt="Post media" className="w-full h-auto object-cover" />
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-4 max-w-md pr-4">

            {/* Like Button */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleLike}
              className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'text-text-secondary hover:text-pink-500'}`}
            >
              <div className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-pink-500/10' : 'group-hover:bg-pink-500/10'}`}>
                {isLiked ? <IoHeartSharp size={20} /> : <IoHeartOutline size={20} />}
              </div>
              <span className="text-sm font-medium">{likesCount || 0}</span>
            </motion.button>

            {/* Share/View */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }}
              className="flex items-center gap-2 group text-text-secondary hover:text-blue-500 transition-colors"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-500/10">
                <IoShareOutline size={20} />
              </div>
            </button>

          </div>
        </div>
      </article>

      <ShareTwistModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        twistId={post.id}
      />
    </>
  );
};

export default TwistCard;
