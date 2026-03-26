// frontend/src/pages/ProfilePage.jsx

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../api/userApi';
import * as PostApi from '../api/postApi';
import { getStoriesByUser } from '../api/storyApi';
import { getReelsByUser } from '../api/reelApi';
import Spinner from '../components/common/Spinner';
import ProfileHeader from '../components/features/profile/ProfileHeader';
import { 
  IoGridOutline, 
  IoLockClosed, 
  IoFilmOutline, 
  IoPlay, 
  IoRepeatOutline, 
  IoHeart, 
  IoChatbubble,
  IoAlertCircleOutline
} from 'react-icons/io5';
import { AuthContext } from '../context/AuthContext';
import StoryViewerModal from '../components/features/feed/StoryViewerModal';
import TwistCard from '../components/features/feed/TwistCard';
import useSEO from '../hooks/useSEO';

// --- Improved Grid Items ---
const PostGridItem = ({ post }) => {
  const isVideo = post.media_file && /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(post.media_file);

  return (
    <Link 
      to={`/post/${post.id}`} 
      className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-background-accent transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
    >
      {isVideo ? (
        <video
          src={post.media_file}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
      ) : (
        <img
          src={post.media_file || 'https://via.placeholder.com/600x600?text=Trend+Post'}
          alt={`Post ID ${post.id}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center space-x-6">
        <div className="flex items-center text-white font-bold">
          <IoHeart className="mr-2 text-xl" />
          {post.likes_count}
        </div>
        <div className="flex items-center text-white font-bold">
          <IoChatbubble className="mr-2 text-xl" />
          {post.comments_count || 0}
        </div>
      </div>

      {post.is_exclusive && (
        <div className="absolute top-3 left-3 bg-purple-600/90 text-white p-1.5 rounded-lg backdrop-blur-md shadow-lg border border-purple-400/30">
          <IoLockClosed className="h-3.5 w-3.5" />
        </div>
      )}
      
      {isVideo && (
        <div className="absolute top-3 right-3 text-white/90 drop-shadow-lg">
          <IoFilmOutline className="h-5 w-5" />
        </div>
      )}
    </Link>
  );
};

const ReelGridItem = ({ reel }) => (
  <Link 
    to={`/reels`} 
    state={{ initialReelId: reel.id }} 
    className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-black transition-all hover:scale-[1.02] hover:shadow-2xl"
  >
    {reel.media_type === 'video' ? (
      <video
        src={reel.media_file}
        className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
        muted
        playsInline
      />
    ) : (
      <img
        src={reel.media_file}
        className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
        alt={reel.caption}
      />
    )}
    
    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
        <IoPlay className="text-white text-2xl ml-1" />
      </div>
    </div>

    {reel.is_exclusive && (
      <div className="absolute top-3 left-3 bg-purple-600/90 text-white p-1.5 rounded-lg backdrop-blur-md shadow-lg z-10 border border-purple-400/30">
        <IoLockClosed className="h-3.5 w-3.5" />
      </div>
    )}

    <div className="absolute bottom-4 left-4 flex items-center text-white drop-shadow-md">
      <IoPlay className="mr-1 text-sm" />
      <span className="text-xs font-bold tracking-wider">{reel.views_count}</span>
    </div>
  </Link>
);


const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);

  useSEO(`${username}'s Profile`, `View ${username}'s profile on Trend Twist.`);

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userReels, setUserReels] = useState([]);
  const [userTwists, setUserTwists] = useState([]);
  const [userDrafts, setUserDrafts] = useState([]);
  const [userStories, setUserStories] = useState(null);

  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerGroups, setViewerGroups] = useState([]);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0); 

  const fetchTwists = useCallback(async (userId) => {
    try {
      const twistsData = await PostApi.getTwistsByUser(userId);
      setUserTwists(twistsData);
    } catch (e) {
      console.error("Twists fail:", e);
      setUserTwists([]);
    }
  }, []);

  const fetchPosts = useCallback(async (userId) => {
    try {
      const postsData = await PostApi.getPostsByUser(userId);
      setUserPosts(postsData);
    } catch (e) {
      console.error("Posts fail:", e);
      setUserPosts([]);
    }
  }, []);

  const fetchReels = useCallback(async (userId) => {
    try {
      const reelsData = await getReelsByUser(userId);
      setUserReels(reelsData.filter(r => !r.is_draft));
      setUserDrafts(reelsData.filter(r => r.is_draft));
    } catch (e) {
      console.error("Reels fail:", e);
      setUserReels([]);
    }
  }, []);

  const fetchStories = useCallback(async (userId, uname, pPic) => {
    try {
      const storyData = await getStoriesByUser(userId);
      if (storyData?.length > 0) {
        setUserStories({
          username: uname,
          profile_picture: pPic,
          stories: storyData,
          hasUnseen: storyData.some(s => !s.is_viewed)
        });
      } else {
        setUserStories(null);
      }
    } catch (e) { setUserStories(null); }
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile(username);
      setProfileData(data);
      const isOwner = data.id === currentUser?.id;
      const canView = !data.profile?.is_private || data.is_following || isOwner;

      if (canView) {
        setLoadingContent(true);
        await Promise.all([
          fetchPosts(data.id),
          fetchTwists(data.id),
          fetchReels(data.id),
          fetchStories(data.id, data.username, data.profile?.profile_picture)
        ]);
        setLoadingContent(false);
      }
    } catch (err) {
      setError(`Profile not found for: ${username}`);
    } finally {
      setLoading(false);
    }
  }, [username, currentUser, fetchPosts, fetchReels, fetchStories, fetchTwists]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStoryClick = () => {
    if (userStories?.stories.length > 0) {
      // Find the first unwatched story
      const firstUnwatched = userStories.stories.findIndex(s => !s.is_viewed);
      const storyIdx = firstUnwatched !== -1 ? firstUnwatched : 0;

      setViewerGroups([userStories]);
      setInitialGroupIndex(0);
      setInitialStoryIndex(storyIdx);
      setIsViewerOpen(true);
    }
  };

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Spinner size="xl" />
        <p className="text-text-secondary animate-pulse font-medium">Curating profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
      <IoAlertCircleOutline className="text-6xl text-text-secondary mb-4" />
      <h2 className="text-2xl font-bold text-text-primary">{error}</h2>
      <button onClick={() => navigate('/')} className="mt-6 text-text-accent font-semibold hover:underline">Return to Home</button>
    </div>
  );

  const isOwner = profileData?.id === currentUser?.id;
  const isPrivate = profileData?.profile?.is_private;
  const isSubscribed = profileData?.is_subscribed;
  const canView = !isPrivate || isOwner || profileData?.is_following;
  const isCreator = profileData?.is_creator || profileData?.profile?.is_creator;

  // Tabs filtering
  const pubPosts = userPosts.filter(p => !p.is_exclusive);
  const pubTwists = userTwists.filter(t => !t.is_exclusive);
  const pubReels = userReels.filter(r => !r.is_exclusive);
  const excContent = [...userPosts, ...userTwists, ...userReels].filter(c => c.is_exclusive);

  return (
    <div className="min-h-screen bg-background-primary pb-20">
      {/* 1. Header Section */}
      <div className="mx-auto max-w-5xl px-4 pt-8 md:px-8">
        {profileData && (
          <ProfileHeader 
            profileData={profileData} 
            onProfileUpdate={fetchProfile} 
            userStories={userStories} 
            handleStoryClick={handleStoryClick}
            isOwner={isOwner} 
          />
        )}
      </div>

      {/* 2. Content Tabs Area */}
      <div className="mx-auto max-w-5xl mt-12 px-2 md:px-8">
        <div className="sticky top-[70px] z-30 flex items-center justify-center space-x-2 border-b border-border bg-background-primary/80 backdrop-blur-xl md:space-x-8">
          {[
            { id: 'posts', icon: <IoGridOutline />, label: 'POSTS' },
            { id: 'twists', icon: <IoRepeatOutline />, label: 'TWISTS' },
            { id: 'reels', icon: <IoFilmOutline />, label: 'REELS' },
            ...(isCreator && (isOwner || isSubscribed) ? [{ id: 'exclusive', icon: <IoLockClosed />, label: 'EXCLUSIVE', color: 'text-purple-500' }] : []),
            ...(isOwner && userDrafts.length > 0 ? [{ id: 'drafts', icon: <IoFilmOutline className="opacity-50" />, label: 'DRAFTS' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group relative flex items-center space-x-2 px-4 py-4 transition-all
                ${activeTab === tab.id ? (tab.color || 'text-text-accent') : 'text-text-secondary hover:text-text-primary'}
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="hidden text-xs font-black tracking-widest md:block">{tab.label}</span>
              {activeTab === tab.id && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${tab.color ? 'bg-purple-500' : 'bg-text-accent'} shadow-[0_-2px_10px_rgba(var(--accent-rgb),0.5)]`} />
              )}
            </button>
          ))}
        </div>

        {/* 3. Main Grid / Feed Display */}
        <div className="mt-8">
          {!canView ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-background-secondary p-16 text-center shadow-xl">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-background-accent text-text-secondary">
                <IoLockClosed className="text-4xl" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">This Account is Private</h3>
              <p className="mt-2 text-text-secondary max-w-sm">
                Follow {profileData.username} to see their photos and videos.
              </p>
            </div>
          ) : loadingContent ? (
            <div className="flex h-40 items-center justify-center"><Spinner size="lg" /></div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {activeTab === 'posts' && (
                <div className="grid grid-cols-3 gap-1.5 md:gap-4">
                  {pubPosts.length > 0 ? (
                    pubPosts.map(p => <PostGridItem key={p.id} post={p} />)
                  ) : (
                    <EmptyPlaceholder icon={<IoGridOutline />} title="No Posts Yet" />
                  )}
                </div>
              )}

              {activeTab === 'twists' && (
                <div className="mx-auto max-w-2xl space-y-6">
                  {pubTwists.length > 0 ? (
                    pubTwists.map(t => (
                      <div key={t.id} className="rounded-2xl border border-border bg-background-secondary transition-shadow hover:shadow-lg">
                        <TwistCard post={t} />
                      </div>
                    ))
                  ) : (
                    <EmptyPlaceholder icon={<IoRepeatOutline />} title="No Twists yet" />
                  )}
                </div>
              )}

              {activeTab === 'reels' && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-4">
                  {pubReels.length > 0 ? (
                    pubReels.map(r => <ReelGridItem key={r.id} reel={r} />)
                  ) : (
                    <EmptyPlaceholder icon={<IoFilmOutline />} title="No Reels yet" />
                  )}
                </div>
              )}

              {activeTab === 'exclusive' && (
                <div className="space-y-12">
                   {excContent.length > 0 ? (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {excContent.map(item => (
                          item.media_type === 'video' || (item.media_file && item.author_username) ? (
                            <PostGridItem key={item.id} post={item} />
                          ) : (
                            <div key={item.id} className="col-span-full mb-4">
                               <TwistCard post={item} />
                            </div>
                          )
                        ))}
                      </div>
                   ) : (
                      <EmptyPlaceholder icon={<IoLockClosed />} title="No exclusive content" />
                   )}
                </div>
              )}

              {activeTab === 'drafts' && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {userDrafts.map(reel => (
                    <div 
                      key={reel.id} 
                      onClick={() => navigate('/create/post', { state: { draft: reel } })}
                      className="group relative block aspect-[9/16] cursor-pointer overflow-hidden rounded-xl bg-gray-900 border border-border"
                    >
                      <video src={reel.media_file} className="h-full w-full object-cover opacity-60 grayscale transition-all group-hover:grayscale-0 group-hover:opacity-100" />
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white backdrop-blur-md border border-white/20 group-hover:bg-text-accent group-hover:text-black">RESUME</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <StoryViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        storyGroups={viewerGroups}
        initialGroupIndex={initialGroupIndex}
        initialStoryIndex={initialStoryIndex}
        onStoriesViewed={fetchStories}
      />
    </div>
  );
};

const EmptyPlaceholder = ({ icon, title }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
    <div className="mb-4 text-6xl text-background-accent">{icon}</div>
    <h3 className="text-xl font-bold text-text-primary">{title}</h3>
    <p className="mt-1 text-text-secondary">Capture and share moments to see them here.</p>
  </div>
);

export default ProfilePage;