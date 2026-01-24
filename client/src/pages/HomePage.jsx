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


const HomePage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [allStoryGroups, setAllStoryGroups] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState(null);

  // Modal States
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);
  // NEW STATE: Holds the exact array to be passed to the Viewer Modal
  const [viewerGroups, setViewerGroups] = useState([]);

  // --- 1. Fetch & Group Stories Logic (Remains the same) ---
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

      setAllStoryGroups(Object.values(grouped));

    } catch (e) {
      console.error("Story API Error:", e);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  // --- 2. Fetch Post Feed Logic (Remains the same) ---
  const fetchFeed = useCallback(async () => {
    setLoadingFeed(true);
    setFeedError(null);
    try {
      const postData = await PostApi.getFeedPosts();
      setFeedPosts(postData);
    } catch (e) {
      setFeedError("Failed to load your feed. Check network or follow status.");
      setFeedPosts([]);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  // --- Initial Data Load ---
  useEffect(() => {
    fetchStories();
    fetchFeed();
  }, [fetchStories, fetchFeed]);

  // --- Prepare Story Data for Rendering ---
  const currentUserUsername = user?.username;
  const userStoryGroup = allStoryGroups.find(
    (group) => group.username === currentUserUsername
  );

  const yourStoryData = {
    username: currentUserUsername || 'You',
    profile_picture: user?.profile?.profile_picture,
    // If user has stories, check if they have unseen ones, otherwise, assume 'unseen' for the plus button look
    hasUnseen: userStoryGroup ? userStoryGroup.hasUnseen : true,
    stories: userStoryGroup ? userStoryGroup.stories : [],
  };

  // Filter out the current user's stories from the main feed array
  const feedStoryGroups = allStoryGroups.filter(
    (group) => group.username !== currentUserUsername
  );

  // --- Story Handlers (FIXED LOGIC) ---
  const handleOpenStoryViewer = (feedIndex) => {
    // 1. Determine if Your Story should be included at the start (index 0)
    const includeYourStory = yourStoryData.stories.length > 0;

    // 2. Create the exact array for the viewer modal
    let groups;
    let initialIndex;

    if (includeYourStory) {
      groups = [yourStoryData, ...feedStoryGroups];
      // If your story is included, the followed user's index shifts by 1
      initialIndex = feedIndex + 1;
    } else {
      groups = feedStoryGroups;
      initialIndex = feedIndex;
    }

    const handleOpenCreatorPage = () => {
      navigate('/create/story');
    };

    // 3. Update state and open modal
    setViewerGroups(groups);
    setInitialGroupIndex(initialIndex);
    setIsViewerOpen(true);
  };

  const handleYourStoryClick = () => {
    if (yourStoryData.stories.length > 0) {
      // 1. If you have stories, open the viewer to see them
      setViewerGroups([yourStoryData, ...feedStoryGroups]);
      setInitialGroupIndex(0); // Your story is always at index 0
      setIsViewerOpen(true);
    } else {
      navigate('/create/story');
    }
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    // Reset viewer state to avoid stale data on next open
    setViewerGroups([]);
    setInitialGroupIndex(0);
    fetchStories();
  };

  const handleStoryCreationSuccess = () => {
    setIsCreatorOpen(false);
    fetchStories();
  }


  // --- Render ---

  return (
    <>
      <div className="flex justify-center w-full min-h-screen pt-4">
        {/* --- Main Container (Responsible for two-column layout on large screens) --- */}
        <div className="flex w-full space-x-0 lg:space-x-8 px-0 md:px-4">

          {/* --- A. Left/Main Content Column (Feed & Stories) --- */}
          <div className="w-full lg:w-3/5 ">

            {/* --- 1. Story Section (Theme-Optimized Sticky Header) --- */}
            <section className=" z-20 py-4 mb-4 glass-flat border-b border-glass-border shadow-sm backdrop-blur-xl">
              {loadingStories ? (
                <div className="flex justify-center py-4"><Spinner size="md" /></div>
              ) : (
                <div className="flex overflow-x-auto px-4 pb-1 scrollbar-hide">

                  {/* Your Story Circle (View OR Create) */}
                  <StoryCircle
                    storyGroup={yourStoryData}
                    isCurrentUser={true}
                    onClick={handleYourStoryClick}
                  />

                  {/* Other Users' Story Circles */}
                  {feedStoryGroups.map((group, index) => (
                    <StoryCircle
                      key={group.username}
                      storyGroup={group}
                      // Pass the index within the feedStoryGroups array
                      onClick={() => handleOpenStoryViewer(index)}
                    />
                  ))}

                  {/* Empty State for Stories */}
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
                <PostList
                  posts={feedPosts}
                  onUpdateFeed={fetchFeed}
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

          {/* --- B. Right Sidebar Column (Trending List & Suggestions) --- */}
          <div className="hidden lg:block lg:w-[35%] sticky top-4 h-full pt-4 min-w-[350px]">
            <HomeTwistSidebar />
          </div>
        </div>
      </div>

      {/* --- 4. Modals (Using the newly set viewerGroups state) --- */}
      <StoryViewerModal
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        storyGroups={viewerGroups} // This state is now set dynamically in the click handlers
        initialGroupIndex={initialGroupIndex}
        onStoriesViewed={fetchStories}
      />

    </>
  );
};

export default HomePage;