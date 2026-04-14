// frontend/src/pages/HomePage.jsx

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
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

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();

  const lastElementRef = useCallback(node => {
     if (loadingFeed || loadingMore) return;
     if (observer.current) observer.current.disconnect();
     observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
             setPage(prev => prev + 1);
        }
     });
     if (node) observer.current.observe(node);
  }, [loadingFeed, loadingMore, hasMore]);

  // Modal States
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0); 
  const [viewerGroups, setViewerGroups] = useState([]);

  // --- 1. Fetch & Group Stories Logic ---
  const fetchStories = useCallback(async () => {
    setLoadingStories(true);
    try {
      const storyData = await getStories();

      const grouped = storyData.reduce((acc, story) => {
        const username = story.author_username;
        if (!acc[username]) {
          acc[username] = {
            username: username,
            profile_picture: story.author_profile_picture,
            stories: [],
            hasUnseen: false,
          };
        }
        acc[username].stories.push(story);
        if (!story.is_viewed) {
          acc[username].hasUnseen = true;
        }
        return acc;
      }, {});

      // Apply the user's requested sorting: unwatched first, followed by watched
      const sortedGroups = Object.values(grouped).sort((a, b) => {
        // 1. Prioritize Unseen groups (true > false)
        if (a.hasUnseen && !b.hasUnseen) return -1;
        if (!a.hasUnseen && b.hasUnseen) return 1;
        
        // 2. Chronological within those categories (newest first)
        const aTime = Math.max(...a.stories.map(s => new Date(s.created_at).getTime()));
        const bTime = Math.max(...b.stories.map(s => new Date(s.created_at).getTime()));
        return bTime - aTime;
      });

      setAllStoryGroups(sortedGroups);

    } catch (e) {
      console.error("Story API Error:", e);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  const fetchFeed = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoadingFeed(true);
    else setLoadingMore(true);
    
    setFeedError(null);
    try {
      const data = await PostApi.getFeedPosts(pageNum);
      // axiosInstance unwraps the results and attaches _paginationContext
      const results = Array.isArray(data) ? data : (data.results || []);
      
      setFeedPosts(prev => {
         if (pageNum === 1) return results;
         return [...prev, ...results];
      });

      const paginationContext = data._paginationContext || {};
      setHasMore(paginationContext.next !== null && paginationContext.next !== undefined);
    } catch (e) {
      setFeedError("Failed to load your feed.");
      if (pageNum === 1) setFeedPosts([]);
    } finally {
      if (pageNum === 1) setLoadingFeed(false);
      else setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStories();
    fetchFeed(1);
  }, [fetchStories, fetchFeed]);

  // Load more
  useEffect(() => {
    if (page > 1) {
       fetchFeed(page);
    }
  }, [page, fetchFeed]);

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
  const handleOpenStoryViewer = (feedIndex) => {
     const includeYourStory = yourStoryData.stories.length > 0;
     let groups = includeYourStory ? [yourStoryData, ...feedStoryGroups] : feedStoryGroups;
     let initialIndex = includeYourStory ? feedIndex + 1 : feedIndex;

     // Calculate where to start: first unwatched story
     const targetGroup = feedStoryGroups[feedIndex];
     const firstUnwatched = targetGroup.stories.findIndex(s => !s.is_viewed);
     const storyIdx = firstUnwatched !== -1 ? firstUnwatched : 0;

     setViewerGroups(groups);
     setInitialGroupIndex(initialIndex);
     setInitialStoryIndex(storyIdx);
     setIsViewerOpen(true);
  };

  const handleYourStoryClick = () => {
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
                  {feedStoryGroups.map((group, index) => (
                    <StoryCircle
                      key={group.username}
                      storyGroup={group}
                      onClick={() => handleOpenStoryViewer(index)}
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
                  <Button onClick={() => fetchFeed(1)} className="mt-4">Try Again</Button>
                </div>
              ) : feedPosts.length > 0 ? (
                <PostList 
                   posts={feedPosts} 
                   onUpdateFeed={() => fetchFeed(1)} 
                   lastPostElementRef={lastElementRef} 
                   loadingMore={loadingMore} 
                />
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