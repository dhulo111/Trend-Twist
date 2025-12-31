// frontend/src/pages/PostDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostDetail } from '../api/postApi';
import Spinner from '../components/common/Spinner';
import Post from '../components/features/feed/Post'; // To display the main post
import CommentSection from '../components/features/feed/CommentSection'; // To manage comments
import { IoArrowBackOutline } from 'react-icons/io5';
import Button from '../components/common/Button';

const PostDetailPage = () => {
  // Get the postId from the URL (routes/index.jsx: path="post/:postId")
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'twists'

  // --- Fetch Post Details ---
  const fetchPost = async () => {
    try {
      setLoading(true);
      const postData = await getPostDetail(postId);
      setPost(postData);
    } catch (err) {
      setError('Failed to load post. It may have been deleted.');
      console.error('Post detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  // --- Render Loading/Error States ---
  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center text-red-500 mt-12 p-8">
        <p className="text-xl font-semibold">{error}</p>
        <div className="mt-6">
          <Button onClick={() => navigate(-1)} leftIcon={<IoArrowBackOutline />}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // If post is loaded, render the content
  return (
    <div className="mx-auto max-w-2xl pb-12">

      <div className="mb-6 flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-text-secondary hover:bg-background-accent"
          title="Go Back"
        >
          <IoArrowBackOutline className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">
          Post Detail
        </h1>
      </div>

      {/* --- 1. Main Post Display --- */}
      {/* We pass a refresh function to Post.jsx so we can update details (like counts) */}
      {post && <Post post={post} onUpdate={fetchPost} />}

      {/* --- 2. Tab Navigation (Comments / Twists) --- */}
      <div className="mt-8 flex space-x-4 border-b border-border">
        <button
          onClick={() => setActiveTab('comments')}
          className={`pb-2 font-semibold transition-colors ${activeTab === 'comments'
              ? 'border-b-2 border-text-accent text-text-accent'
              : 'text-text-secondary hover:text-text-primary'
            }`}
        >
          Comments ({post?.comments_count || 0})
        </button>
        <button
          onClick={() => setActiveTab('twists')}
          className={`pb-2 font-semibold transition-colors ${activeTab === 'twists'
              ? 'border-b-2 border-text-accent text-text-accent'
              : 'text-text-secondary hover:text-text-primary'
            }`}
        >
          Twists ({post?.twists_count || 0})
        </button>
      </div>

      {/* --- 3. Content Area based on Tab --- */}
      <div className="pt-6">
        {activeTab === 'comments' && <CommentSection postId={postId} />}

        {activeTab === 'twists' && (
          <div className="card p-8 text-center text-text-secondary">
            <h3 className="text-xl font-semibold">
              Twist Section (Feature Implementation)
            </h3>
            <p className="mt-2">
              This area will show all the 'Twist' posts that responded to the original post.
            </p>
            {/* TODO: Add TwistList component here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailPage;