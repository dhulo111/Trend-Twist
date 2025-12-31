import React, { useState, useEffect, useContext } from 'react';
import { fetchReelComments, addReelComment } from '../../../api/reelApi'; // Use reelApi
import { deleteComment as apiDeleteComment } from '../../../api/postApi'; // Can reuse delete if ID is unique or Create dedicated deleteReelComment
import { AuthContext } from '../../../context/AuthContext';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import { IoTrashOutline, IoChatbubbleOutline, IoCloseOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const Comment = ({ comment, onDelete }) => {
  const { user } = useContext(AuthContext);
  const isAuthor = user?.id === comment.author;

  return (
    <div className="flex space-x-3 py-3 animate-fade-in">
      <Link to={`/profile/${comment.author_username}`} className='flex-shrink-0'>
        <Avatar src={comment.author_profile_picture} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Link to={`/profile/${comment.author_username}`} className="font-semibold text-white text-sm hover:underline">
            {comment.author_username}
          </Link>
          <span className="text-gray-400 text-xs">
            {formatTimeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-gray-200 text-sm">{comment.text}</p>
      </div>
    </div>
  );
};

const ReelCommentDrawer = ({ reelId, isOpen, onClose }) => {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && reelId) {
      fetchComments();
    }
  }, [isOpen, reelId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await fetchReelComments(reelId);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      const newComment = await addReelComment(reelId, newCommentText);
      setComments((prev) => [
        ...prev,
        {
          ...newComment,
          author_username: user.username,
          author_profile_picture: user.profile?.profile_picture,
          created_at: new Date().toISOString()
        }
      ]);
      setNewCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#121212] rounded-t-2xl h-[60vh] flex flex-col animate-slide-in-up border-t border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-center items-center p-3 border-b border-white/5 relative">
          <div className="w-10 h-1 bg-white/20 rounded-full absolute top-2"></div>
          <h3 className="font-bold text-white text-sm mt-2">Comments</h3>
          <button onClick={onClose} className="absolute right-4 top-4 text-white">
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth">
          {loading ? (
            <div className="flex justify-center py-6"><Spinner size="md" /></div>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <Comment key={comment.id} comment={comment} onDelete={() => { }} />
            ))
          ) : (
            <div className="text-center text-gray-500 mt-10">
              <p>No comments yet.</p>
              <p className="text-xs">Start the conversation.</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/10 bg-[#121212]">
          <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2">
            <Avatar src={user?.profile?.profile_picture} size="sm" />
            <input
              className="flex-1 bg-white/10 rounded-full px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
              placeholder={`Add a comment as ${user?.username}...`}
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting}
              className="text-pink-500 font-bold text-sm disabled:opacity-50 hover:text-pink-400"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReelCommentDrawer;
