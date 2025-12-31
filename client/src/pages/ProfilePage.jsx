import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../api/userApi';
import * as PostApi from '../api/postApi';
import { getStoriesByUser } from '../api/storyApi';
import { getReelsByUser } from '../api/reelApi'; // Import Reel API
import Spinner from '../components/common/Spinner';
import ProfileHeader from '../components/features/profile/ProfileHeader';
import Button from '../components/common/Button';
import { IoGridOutline, IoLockClosed, IoTimeOutline, IoHeartOutline, IoFilmOutline, IoPlay } from 'react-icons/io5';
import { AuthContext } from '../context/AuthContext';
import StoryViewerModal from '../components/features/feed/StoryViewerModal';

// --- Grid Items ---
const PostGridItem = ({ post }) => (
  <Link to={`/post/${post.id}`} className="block w-full aspect-square overflow-hidden rounded-lg hover:opacity-85 transition-opacity relative group bg-background-accent/50">
    <img
      src={post.media_file || 'https://via.placeholder.com/600x600?text=Trend+Post'}
      alt={`Post ID ${post.id}`}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-x-4">
      <span className="text-white font-semibold text-lg flex items-center">
        <IoHeartOutline className="h-5 w-5 mr-1" /> {post.likes_count}
      </span>
      <span className="text-white font-semibold text-lg flex items-center">
        <IoTimeOutline className="h-5 w-5 mr-1" /> {post.twists_count}
      </span>
    </div>
  </Link>
);

const ReelGridItem = ({ reel }) => (
  <Link to={`/reels`} state={{ initialReelId: reel.id }} className="block w-full aspect-[9/16] overflow-hidden rounded-lg hover:opacity-85 transition-opacity relative group bg-black">
    <video
      src={reel.video_file}
      className="w-full h-full object-cover pointer-events-none"
      muted
      playsInline // Show first frame mostly
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <IoPlay className="text-white/80 text-3xl drop-shadow-md" />
    </div>
    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
      <span className="text-white text-xs font-semibold flex items-center">
        <IoPlay className="h-3 w-3 mr-1" /> {reel.views_count}
      </span>
    </div>
  </Link>
);


const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate(); // Add this hook
  const { user: currentUser } = useContext(AuthContext);

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userReels, setUserReels] = useState([]); // Reels State
  const [userDrafts, setUserDrafts] = useState([]); // Drafts State
  const [userStories, setUserStories] = useState(null);

  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'reels', 'drafts'

  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);

  // Story Viewer States
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerGroups, setViewerGroups] = useState([]);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);


  // --- 1. Fetch User's Posts ---
  const fetchPosts = useCallback(async (userId) => {
    try {
      const postsData = await PostApi.getPostsByUser(userId);
      setUserPosts(postsData);
    } catch (e) {
      console.error("Error fetching user posts:", e);
      setUserPosts([]);
    }
  }, []);

  // --- 2. Fetch User's Reels ---
  const fetchReels = useCallback(async (userId) => {
    try {
      const reelsData = await getReelsByUser(userId);
      // Client-side filtering for drafts (until dedicated endpoint)
      const published = reelsData.filter(r => !r.is_draft);
      const drafts = reelsData.filter(r => r.is_draft);

      setUserReels(published);
      setUserDrafts(drafts);
    } catch (e) {
      console.error("Error fetching user reels:", e);
      setUserReels([]);
      setUserDrafts([]);
    }
  }, []);

  // --- 3. Fetch User's Stories ---
  const fetchStories = useCallback(async (userId, username, profilePic) => {
    try {
      const storyData = await getStoriesByUser(userId);

      if (storyData && storyData.length > 0) {
        const storyGroup = {
          username: username,
          profile_picture: profilePic,
          stories: storyData,
          hasUnseen: storyData.some(s => !s.is_viewed)
        };
        setUserStories(storyGroup);
      } else {
        setUserStories(null);
      }
    } catch (e) {
      console.error("Error fetching user stories:", e);
      setUserStories(null);
    }
  }, []);


  // --- 4. Fetch Profile Details (Main Entry Point) ---
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile(username);
      setProfileData(data);

      const isOwner = data.id === currentUser?.id;
      const canViewContent = !data.profile?.is_private || data.is_following || isOwner;

      if (canViewContent) {
        setLoadingContent(true);
        // Fetch posts, reels, and stories concurrently
        await Promise.all([
          fetchPosts(data.id),
          fetchReels(data.id),
          fetchStories(data.id, data.username, data.profile?.profile_picture)
        ]);
        setLoadingContent(false);
      } else {
        setUserPosts([]);
        setUserReels([]);
        setUserStories(null);
      }

    } catch (err) {
      setError(`Failed to load profile for user: ${username}. User may not exist.`);
    } finally {
      setLoading(false);
    }
  }, [username, currentUser, fetchPosts, fetchReels, fetchStories]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStoryClick = () => {
    if (userStories?.stories.length > 0) {
      setViewerGroups([userStories]);
      setInitialGroupIndex(0);
      setIsViewerOpen(true);
    }
  };


  // --- Render Logic ---
  if (loading) { return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>; }
  if (error) { return <div className="text-center pt-20 text-red-500">{error}</div>; }

  const isOwner = profileData?.id === currentUser?.id;
  const isPrivate = profileData?.profile?.is_private;
  const canViewContent = !isPrivate || isOwner || profileData?.is_following;


  return (
    <>
      <div className="w-full min-h-screen px-0 md:px-4 lg:px-8 pb-12 pt-4">
        {/* 1. Profile Header */}
        {profileData && (
          <ProfileHeader profileData={profileData} onProfileUpdate={fetchProfile} userStories={userStories} handleStoryClick={handleStoryClick}
            isOwner={isOwner} />
        )}

        {/* --- Content Area --- */}
        <div className='mt-8'>

          {/* 2. Tabs */}
          <div className="flex justify-center border-t border-border mb-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center space-x-2 px-8 py-4 border-t-2 transition-all ${activeTab === 'posts' ? 'border-text-accent text-text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              <IoGridOutline className="h-5 w-5" />
              <span className="font-semibold text-sm tracking-wider">POSTS</span>
            </button>
            <button
              onClick={() => setActiveTab('reels')}
              className={`flex items-center space-x-2 px-8 py-4 border-t-2 transition-all ${activeTab === 'reels' ? 'border-text-accent text-text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              <IoFilmOutline className="h-5 w-5" />
              <span className="font-semibold text-sm tracking-wider">REELS</span>
            </button>
            {isOwner && userDrafts.length > 0 && (
              <button
                onClick={() => setActiveTab('drafts')}
                className={`flex items-center space-x-2 px-8 py-4 border-t-2 transition-all ${activeTab === 'drafts' ? 'border-text-accent text-text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                <IoFilmOutline className="h-5 w-5 opacity-50" />
                <span className="font-semibold text-sm tracking-wider">DRAFTS</span>
              </button>
            )}
          </div>

          {/* 3. Render Content */}
          {canViewContent ? (
            <div>
              {loadingContent ? (
                <div className="text-center py-12"><Spinner size="lg" /></div>
              ) : (
                <>
                  {/* POSTS GRID */}
                  {activeTab === 'posts' && (
                    <div className="grid grid-cols-3 gap-1 md:gap-3">
                      {userPosts.length > 0 ? (
                        userPosts.map((post) => <PostGridItem key={post.id} post={post} />)
                      ) : (
                        <div className="col-span-3 text-center text-text-secondary p-12 card border border-border">
                          <IoGridOutline className="mx-auto text-4xl mb-3 opacity-50" />
                          <h3 className="text-lg font-semibold">No Posts Yet</h3>
                          {isOwner && (
                            <Button className="mt-3" to="/create/post" variant="primary">Share a Post</Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* REELS GRID */}
                  {activeTab === 'reels' && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3">
                      {userReels.length > 0 ? (
                        userReels.map((reel) => <ReelGridItem key={reel.id} reel={reel} />)
                      ) : (
                        <div className="col-span-full text-center text-text-secondary p-12 card border border-border">
                          <IoFilmOutline className="mx-auto text-4xl mb-3 opacity-50" />
                          <h3 className="text-lg font-semibold">No Reels Yet</h3>
                          {isOwner && (
                            <Button className="mt-3" to="/create/post" variant="primary">Create a Reel</Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DRAFTS GRID */}
                  {activeTab === 'drafts' && isOwner && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3 text-white">
                      {userDrafts.map((reel) => (
                        <div
                          key={reel.id}
                          onClick={() => navigate('/create/post', { state: { draft: reel } })}
                          className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden border border-border opacity-70 hover:opacity-100 transition-opacity cursor-pointer group"
                        >
                          <video src={reel.video_file} className="w-full h-full object-cover grayscale" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-black/50 px-3 py-1 rounded text-sm font-bold group-hover:bg-cyan-500 group-hover:text-black transition-colors">EDIT DRAFT</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // Locked View
            <div className="text-center py-16 text-text-secondary border border-border rounded-xl card mt-8">
              <IoLockClosed className="h-16 w-16 mx-auto mb-4 text-text-secondary" />
              <h3 className="text-2xl font-bold text-text-primary">
                This Account is Private
              </h3>
              <p className="mt-2">
                {profileData.has_pending_request
                  ? "Your follow request is pending review."
                  : "Follow this user to see their content."}
              </p>
            </div>
          )}
        </div>
      </div>

      <StoryViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        storyGroups={viewerGroups}
        initialGroupIndex={initialGroupIndex}
        onStoriesViewed={fetchStories}
      />
    </>
  );
};

export default ProfilePage;