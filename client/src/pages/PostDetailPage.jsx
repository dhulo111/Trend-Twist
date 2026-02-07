import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostDetail, getTwistsForPost } from '../api/postApi';
import Spinner from '../components/common/Spinner';
import Post from '../components/features/feed/Post';
import CommentSection from '../components/features/feed/CommentSection';
import TwistCard from '../components/features/feed/TwistCard';
import { IoArrowBackOutline } from 'react-icons/io5';
import Button from '../components/common/Button';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'twists'

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

      {post && <Post post={post} onUpdate={fetchPost} />}

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

      <div className="pt-6">
        {activeTab === 'comments' && <CommentSection postId={postId} />}

        {activeTab === 'twists' && (
          <TwistList postId={postId} />
        )}
      </div>
    </div>
  );
};

const TwistList = ({ postId }) => {
  const [twists, setTwists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTwists = async () => {
      setLoading(true);
      try {
        const data = await getTwistsForPost(postId);
        setTwists(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTwists();
  }, [postId]);

  if (loading) return <div className="text-center py-8"><Spinner /></div>;

  if (twists.length === 0) {
    return (
      <div className="text-center text-text-secondary py-12 border border-border rounded-xl">
        <h3 className="text-lg font-semibold">No Twists Yet</h3>
        <p>Be the first to Twist this post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {twists.map(twist => (
        <div key={twist.id} className="border border-border rounded-xl bg-background-secondary overflow-hidden shadow-sm">
          <TwistCard post={twist} />
        </div>
      ))}
    </div>
  );
};

export default PostDetailPage;