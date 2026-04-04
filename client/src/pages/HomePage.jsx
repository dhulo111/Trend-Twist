// frontend/src/pages/HomePage.jsx

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getStories } from '../api/storyApi';
import * as PostApi from '../api/postApi';
import { AuthContext } from '../context/AuthContext';

// --- Components ---
import PostList from '../components/features/feed/PostList';
import StoryCircle from '../components/features/feed/StoryCircle';
import StoryViewerModal from '../components/features/feed/StoryViewerModal';
import HomeTwistSidebar from '../components/features/trends/HomeTwistSidebar';

// --- Common UI ---
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import { IoCloudOfflineOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import useSEO from '../hooks/useSEO';


const HomePage = () => {
  useSEO('Home', 'Welcome to Trend Twist, your ultimate destination for following friends and discovering new trends.');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [allStoryGroups, setAllStoryGroups] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState(null);

  // Modal States
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0); 
  const [viewerGroups, setViewerGroups] = useState([]);

  // --- 1. Fetch & Group Stories Logic ---
  const fetchStories = useCallback(async () => {
    setLoadingStories(true);
    try {
      const { stories: storyData, live_streams: liveStreams } = await getStories();

      // 1. Group normal stories by user
      const storyGroups = storyData.reduce((acc, story) => {
        const username = story.author_username;
        if (!acc[username]) {
          acc[username] = {
            username: username,
            profile_picture: story.author_profile_picture,
            stories: [],
            hasUnseen: false,
            is_live: false,
          };
        }
        acc[username].stories.push(story);
        if (!story.is_viewed) {
          acc[username].hasUnseen = true;
        }
        return acc;
      }, {});

      // 2. Add Live Stream status to groups or create new ones
      liveStreams.forEach(stream => {
        const username = stream.host_username;
        if (storyGroups[username]) {
          storyGroups[username].is_live = true;
          storyGroups[username].stream_id = stream.stream_id;
        } else {
          storyGroups[username] = {
            username: username,
            profile_picture: stream.host_profile_picture,
            stories: [],
            hasUnseen: false,
            is_live: true,
            stream_id: stream.stream_id,
          };
        }
      });

      // 3. Sorting logic: LIVE first, then Unseen, then Seen
      const sortedGroups = Object.values(storyGroups).sort((a, b) => {
        // High priority to LIVE
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;

        // Next priority: Unseen stories (if not live)
        if (a.hasUnseen && !b.hasUnseen) return -1;
        if (!a.hasUnseen && b.hasUnseen) return 1;
        
        // Finally: Chronological
        const aTime = a.stories.length > 0 ? Math.max(...a.stories.map(s => new Date(s.created_at).getTime())) : 0;
        const bTime = b.stories.length > 0 ? Math.max(...b.stories.map(s => new Date(s.created_at).getTime())) : 0;
        return bTime - aTime;
      });

      setAllStoryGroups(sortedGroups);

    } catch (e) {
      console.error("Story API Error:", e);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    setLoadingFeed(true);
    setFeedError(null);
    try {
      const postData = await PostApi.getFeedPosts();
      setFeedPosts(postData);
    } catch (e) {
      setFeedError("Failed to load your feed.");
      setFeedPosts([]);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
    fetchFeed();
  }, [fetchStories, fetchFeed]);

  const currentUserUsername = user?.username;
  const userStoryGroup = allStoryGroups.find((group) => group.username === currentUserUsername);

  const yourStoryData = {
    username: currentUserUsername || 'You',
    profile_picture: user?.profile?.profile_picture,
    hasUnseen: userStoryGroup ? userStoryGroup.hasUnseen : true,
    stories: userStoryGroup ? userStoryGroup.stories : [],
  };

  const feedStoryGroups = allStoryGroups.filter((group) => group.username !== currentUserUsername);

  // --- Story Handlers ---
  const handleOpenStoryViewer = (group, index) => {
     if (group.is_live) {
       // Deep link or navigate to Live stream
       navigate(`/live/${group.stream_id}`);
       return;
     }

     const includeYourStory = yourStoryData.stories.length > 0;
     const feedGroupsOnly = feedStoryGroups.filter(g => !g.is_live);
     const yourStoryGroup = yourStoryData.stories.length > 0 ? [yourStoryData] : [];
     
     let groups = [...yourStoryGroup, ...feedGroupsOnly];
     
     // Find the index of the clicked group in the final viewer list
     let initialIndex = groups.findIndex(g => g.username === group.username);
     if (initialIndex === -1) initialIndex = 0;

     const firstUnwatched = group.stories.findIndex(s => !s.is_viewed);
     const storyIdx = firstUnwatched !== -1 ? firstUnwatched : 0;

     setViewerGroups(groups);
     setInitialGroupIndex(initialIndex);
     setInitialStoryIndex(storyIdx);
     setIsViewerOpen(true);
  };

  const handleYourStoryClick = () => {
    if (yourStoryData.is_live) {
      navigate(`/live/${yourStoryData.stream_id}`);
      return;
    }
    if (yourStoryData.stories.length > 0) {
      const firstUnwatched = yourStoryData.stories.findIndex(s => !s.is_viewed);
      const storyIdx = firstUnwatched !== -1 ? firstUnwatched : 0;

      setViewerGroups([yourStoryData, ...feedStoryGroups]);
      setInitialGroupIndex(0);
      setInitialStoryIndex(storyIdx);
      setIsViewerOpen(true);
    } else {
      navigate('/create/story');
    }
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setViewerGroups([]);
    setInitialGroupIndex(0);
    setInitialStoryIndex(0);
    fetchStories();
  };

  // --- Real-time Live Updates ---
  useEffect(() => {
    // We can rely on the global notification socket from AuthContext if we expose it,
    // but for now, let's fetchStories when we get a live notification if possible.
    // However, since HomePage doesn't have direct access to the socket ref, 
    // we should ideally add a listener in a way that triggers fetchStories.
    
    const handleGlobalNotification = (e) => {
       const data = e.detail;
       if (data?.notification_type === 'live_start' || data?.notification_type === 'live_end') {
          fetchStories();
       }
    };

    window.addEventListener('trendtwist_notification', handleGlobalNotification);
    return () => window.removeEventListener('trendtwist_notification', handleGlobalNotification);
  }, [fetchStories]);


  return (
    <>
      <div className="flex justify-center w-full min-h-screen pt-4">
        <div className="flex w-full space-x-0 lg:space-x-8 px-0 md:px-4">
          <div className="w-full lg:w-3/5 ">
            <section className="z-20 py-4 mb-4 glass-flat border-b border-glass-border shadow-sm backdrop-blur-xl">
              {loadingStories ? (
                <div className="flex justify-center py-4"><Spinner size="md" /></div>
              ) : (
                <div className="flex overflow-x-auto px-4 pb-1 scrollbar-hide">
                  <StoryCircle
                    storyGroup={yourStoryData}
                    isCurrentUser={true}
                    onClick={handleYourStoryClick}
                  />
                  {feedStoryGroups.map((group) => (
                    <StoryCircle
                      key={group.username}
                      storyGroup={group}
                      onClick={() => handleOpenStoryViewer(group)}
                    />
                  ))}
                  {feedStoryGroups.length === 0 && yourStoryData.stories.length === 0 && !loadingStories && (
                    <p className='text-text-secondary py-3 text-sm flex items-center justify-center min-w-[200px]'>
                      Follow users to see stories.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section>
              {loadingFeed ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
              ) : feedError ? (
                <div className="text-center py-12 text-text-secondary rounded-xl card border-red-500/50 border-2 bg-red-500/10">
                  <IoCloudOfflineOutline className="h-10 w-10 mx-auto mb-3 text-red-500" />
                  <h3 className="text-lg text-text-primary font-bold">Connection Error</h3>
                  <p>{feedError}</p>
                  <Button onClick={fetchFeed} className="mt-4">Try Again</Button>
                </div>
              ) : feedPosts.length > 0 ? (
                <PostList posts={feedPosts} onUpdateFeed={fetchFeed} />
              ) : (
                <div className="text-center py-12 text-text-secondary rounded-xl card border-text-accent/50 border-2">
                  <h3 className="text-xl font-bold text-text-primary">Welcome to TrendTwist!</h3>
                  <p className="mt-2">Follow users or check out the Trending page to see content.</p>
                  <Button to="/trending" variant="primary" className="mt-4">Go to Trending</Button>
                </div>
              )}
            </section>
          </div>

          <div className="hidden lg:block lg:w-[35%] sticky top-4 h-full pt-4 min-w-[350px]">
            <HomeTwistSidebar />
          </div>
        </div>
      </div>

      <StoryViewerModal
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        storyGroups={viewerGroups}
        initialGroupIndex={initialGroupIndex}
        initialStoryIndex={initialStoryIndex} // Use the new state
        onStoriesViewed={fetchStories}
      />
    </>
  );
};

export default HomePage;