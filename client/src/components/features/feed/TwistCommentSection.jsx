// frontend/src/components/features/feed/TwistCommentSection.jsx

import React, { useState, useEffect, useContext } from 'react';
import { getTwistComments, createTwistComment, deleteTwistComment } from '../../../api/postApi';
import { AuthContext } from '../../../context/AuthContext';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import { IoTrashOutline, IoChatbubbleOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';

// --- Utility: Format Time ---
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return past.toLocaleDateString();
};

/**
 * Renders a single comment block.
 */
const Comment = ({ comment, onDelete }) => {
  const { user } = useContext(AuthContext);
  const isAuthor = user?.id === comment.author;

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      onDelete(comment.id);
    }
  };

  return (
    <div className="flex space-x-3 py-3 border-b border-white/10 hover:bg-white/[0.02] px-2 transition-colors">
      {/* Avatar and Link to Profile */}
      <Link to={`/profile/${comment.author_username}`} className='flex-shrink-0'>
        <Avatar src={comment.author_profile_picture} size="sm" />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link to={`/profile/${comment.author_username}`} className="font-bold text-white mr-2 hover:underline">
              {comment.author_username}
            </Link>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          {/* Delete Button (Only for author) */}
          {isAuthor && (
            <button
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-500 transition-colors p-1"
              title="Delete Reply"
            >
              <IoTrashOutline size={14} />
            </button>
          )}
        </div>
        <p className="mt-0.5 text-gray-200 text-sm whitespace-pre-wrap">{comment.text}</p>
      </div>
    </div>
  );
};

/**
 * Main Twist Comment Section component.
 */
const TwistCommentSection = ({ twistId }) => {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch Comments ---
  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await getTwistComments(twistId);
      setComments(data);
    } catch (err) {
      setError('Failed to load replies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [twistId]);

  // --- Handle New Comment Submission ---
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newComment = await createTwistComment(twistId, newCommentText);

      // Optimistically update the list with the new comment
      setComments((prev) => [
        ...prev,
        {
          ...newComment,
          author_username: user.username,
          author_profile_picture: user.profile?.profile_picture,
          // Ensure timestamp is added for immediate rendering
          created_at: new Date().toISOString()
        }
      ]);
      setNewCommentText(''); // Clear input
    } catch (err) {
      setError('Failed to post reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Comment Deletion ---
  const handleDeleteComment = async (commentId) => {
    try {
      await deleteTwistComment(commentId);
      // Remove the comment from the local state instantly
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError('Failed to delete reply. Permission denied.');
    }
  };

  // --- Render ---
  return (
    <div className="mt-6">

      {/* --- New Reply Form --- */}
      <h3 className="text-lg font-bold text-white mb-4">Replies ({comments.length})</h3>

      <div className="flex gap-3 mb-6">
        <Avatar src={user?.profile?.profile_picture} size="md" />
        <div className="flex-1">
          <form onSubmit={handleCommentSubmit} className="relative">
            <textarea
              className="w-full bg-transparent border-b border-white/20 text-white placeholder-gray-500 outline-none focus:border-accent py-2 min-h-[50px] resize-none"
              placeholder="Post your reply"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmitting}
                className="bg-accent hover:bg-accent/80 text-white rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Replying...' : 'Reply'}
              </button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>
      </div>

      {/* --- Comments List --- */}
      <div className="space-y-0 border-t border-white/10">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onDelete={handleDeleteComment}
            />
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No replies yet. Be the first to reply!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwistCommentSection;
