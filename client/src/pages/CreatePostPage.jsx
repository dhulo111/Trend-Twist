import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import CreatePost from '../components/features/feed/CreatePost';
import CreateReel from '../components/features/feed/CreateReel';
import Button from '../components/common/Button';
import { IoCloseOutline, IoImageOutline, IoFilmOutline } from 'react-icons/io5';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('post');

  // Check for incoming draft
  const initialDraft = location.state?.draft || null;

  // If draft exists, default to reel tab
  useEffect(() => {
    if (initialDraft) {
      setActiveTab('reel');
    }
  }, [initialDraft]);

  // After post creation, navigate back to the home feed
  const handleSuccess = () => {
    alert('Post created successfully!');
    navigate('/');
  };

  const handleReelSuccess = () => {
    alert('Reel created successfully!');
    navigate('/');
  };

  return (
    <div className="flex justify-center min-h-[90vh] py-8 bg-background-primary">
      <div className="w-full max-w-lg">

        {/* --- Header (Custom Navigation) --- */}
        <div className="flex justify-between items-center mb-6 px-4 md:px-0">
          <h1 className="text-3xl font-bold text-text-primary">Create New</h1>
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            leftIcon={<IoCloseOutline className='h-6 w-6' />}
            className="rounded-full px-3 py-1.5"
          >
            Close
          </Button>
        </div>

        {/* --- Tab Switcher --- */}
        <div className="flex bg-background-secondary p-1 rounded-xl mb-6 mx-4 md:mx-0">
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${activeTab === 'post'
              ? 'bg-background-primary text-text-accent shadow-sm font-bold'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <IoImageOutline className="text-xl" />
            <span>Post</span>
          </button>
          <button
            onClick={() => setActiveTab('reel')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${activeTab === 'reel'
              ? 'bg-background-primary text-text-accent shadow-sm font-bold'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <IoFilmOutline className="text-xl" />
            <span>Reel</span>
          </button>
        </div>

        {/* --- Main Creation Component --- */}
        <div className="px-4 md:px-0">
          {activeTab === 'post' ? (
            <CreatePost onPostSuccess={handleSuccess} />
          ) : (
            <CreateReel onSuccess={handleReelSuccess} initialDraft={initialDraft} />
          )}
        </div>

      </div>
    </div>
  );
};

export default CreatePostPage;