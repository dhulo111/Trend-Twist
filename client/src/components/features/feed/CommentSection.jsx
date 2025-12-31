// frontend/src/components/features/feed/CommentSection.jsx

import React, { useState, useEffect, useContext } from 'react';
import { getComments, createComment, deleteComment as apiDeleteComment } from '../../../api/postApi';
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
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDelete(comment.id);
    }
  };

  return (
    <div className="flex space-x-3 py-3 border-b border-border/50">
      {/* Avatar and Link to Profile */}
      <Link to={`/profile/${comment.author_username}`} className='flex-shrink-0'>
        <Avatar src={comment.author_profile_picture} size="sm" />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <Link to={`/profile/${comment.author_username}`} className="font-semibold text-text-primary mr-2 hover:text-text-accent transition-colors">
            {comment.author_username}
          </Link>
          <span className="text-xs text-text-secondary">
            {formatTimeAgo(comment.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-text-primary text-sm whitespace-pre-wrap">{comment.text}</p>
      </div>

      {/* Delete Button (Only for author) */}
      {isAuthor && (
        <button
          onClick={handleDelete}
          className="text-text-secondary hover:text-red-500 transition-colors"
          title="Delete Comment"
        >
          <IoTrashOutline className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Main Comment Section component.
 */
const CommentSection = ({ postId }) => {
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
      const data = await getComments(postId);
      setComments(data);
    } catch (err) {
      setError('Failed to load comments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // --- Handle New Comment Submission ---
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newComment = await createComment(postId, newCommentText);

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
      setError('Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Comment Deletion ---
  const handleDeleteComment = async (commentId) => {
    try {
      await apiDeleteComment(commentId);
      // Remove the comment from the local state instantly
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError('Failed to delete comment. Permission denied.');
    }
  };

  // --- Render ---
  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold text-text-primary mb-4">
        Comments ({comments.length})
      </h3>

      {/* --- New Comment Form --- */}
      <div className="mb-6 rounded-xl border border-border bg-background-secondary p-4 shadow-sm">
        <form onSubmit={handleCommentSubmit} className="flex items-center space-x-3">
          <Avatar src={user?.profile?.profile_picture} size="md" />
          <Input
            id="newComment"
            type="text"
            placeholder="Add a comment..."
            value={newCommentText}
            onChange={(e) => {
              setNewCommentText(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button
            type="submit"
            size="md"
            disabled={!newCommentText.trim() || isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Post'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {/* --- Comments List --- */}
      <div className="space-y-1">
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
          <div className="text-center text-text-secondary p-8 border border-border rounded-lg bg-background-accent/50">
            <IoChatbubbleOutline className="h-8 w-8 mx-auto mb-2" />
            <p className='font-medium'>
              No comments yet. Be the first to engage!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;