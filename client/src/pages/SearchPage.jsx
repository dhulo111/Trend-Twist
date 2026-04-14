// frontend/src/pages/SearchPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { IoSearchOutline, IoLockClosed } from 'react-icons/io5';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Spinner from '../components/common/Spinner';
import { useDebounce } from '../hooks/useDebounce'; // Assuming this hook is defined
import { searchUsers, toggleFollow } from '../api/userSearchApi'; // API functions

// --- Sub-Component: Search Result Item ---
// Reusing the logic from the modal, but optimized for the page layout.

const SearchResultItem = ({ user, onFollowToggle, isUpdating, onProfileClick }) => {
  const isPrivate = user.profile?.is_private;
  const isFollowing = user.is_following;
  const hasPendingRequest = user.has_pending_request;
  const navigate = useNavigate();

  // Determine the button label and action
  let buttonText = 'Follow';
  let buttonVariant = 'primary';
  let buttonDisabled = isUpdating;

  if (isFollowing) {
    buttonText = 'Unfollow';
    buttonVariant = 'secondary';
  } else if (hasPendingRequest) {
    buttonText = 'Requested';
    buttonVariant = 'secondary';
    buttonDisabled = true;
  } else if (isPrivate) {
    buttonText = 'Request';
    buttonVariant = 'secondary';
  }

  const handleProfileClick = () => {
    if (onProfileClick) onProfileClick(user);
    navigate(`/profile/${user.username}`);
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-background-accent transition-colors border-b border-border/50">
      {/* User Info */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={handleProfileClick}>
        <Avatar src={user.profile?.profile_picture} size="md" />
        <div>
          <p className="font-semibold text-text-primary">{user.username}</p>
          <p className="text-sm text-text-secondary">
            {user.first_name} {user.last_name}
            {isPrivate && <IoLockClosed className="inline-block ml-1 h-3 w-3 text-text-secondary" title="Private Account" />}
          </p>
        </div>
      </div>

      {/* Follow Button */}
      <Button
        variant={buttonVariant}
        disabled={buttonDisabled}
        size="sm"
        onClick={() => onFollowToggle(user.id)}
        className="w-24 justify-center"
      >
        {isUpdating ? <Spinner size="sm" /> : buttonText}
      </Button>
    </div>
  );
};

// --- Main Component: SearchPage ---

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [history, setHistory] = useState([]);

  const debouncedQuery = useDebounce(query, 500);

  // --- Search Logic ---
  const searchUsersFunction = useCallback(async (searchQuery) => {
    if (!searchQuery) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await searchUsers(searchQuery);
      setResults(data);
    } catch (err) {
      setError('Failed to search users. Check API connection.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    searchUsersFunction(debouncedQuery);
  }, [debouncedQuery, searchUsersFunction]);

  // --- Optimized Follow Toggle Logic ---
  const handleFollowToggle = async (userId) => {
    setUpdatingId(userId);
    setError(null);

    try {
      const response = await toggleFollow(userId);
      const status = response.status;

      // Optimistically update the single user's status in the results array
      setResults(prevResults => prevResults.map(user => {
        if (user.id === userId) {
          let newIsFollowing = user.is_following;
          let newHasPendingRequest = user.has_pending_request;

          if (status === 'followed') {
            newIsFollowing = true;
            newHasPendingRequest = false;
          } else if (status === 'unfollowed') {
            newIsFollowing = false;
            newHasPendingRequest = false;
          } else if (status === 'request_sent') {
            newHasPendingRequest = true;
          } else if (status === 'request_cancelled') {
            newHasPendingRequest = false;
          }

          return {
            ...user,
            is_following: newIsFollowing,
            has_pending_request: newHasPendingRequest
          };
        }
        return user;
      }));

    } catch (e) {
      setError('Could not complete action. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };
  
  // --- History Logic ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { setHistory([]); }
    }
  }, []);

  const addToHistory = useCallback((userData) => {
    setHistory(prev => {
      // Create a simplified version of user data to store
      const simplified = {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile: {
          profile_picture: userData.profile?.profile_picture,
          is_private: userData.profile?.is_private
        },
        is_following: userData.is_following,
        has_pending_request: userData.has_pending_request
      };
      
      const filtered = prev.filter(u => u.id !== userData.id);
      const newHistory = [simplified, ...filtered].slice(0, 8);
      localStorage.setItem('search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search_history');
  };

  return (
    <div className="flex justify-center min-h-[85vh] pt-4">
      <div className="w-full max-w-4xl">

        {/* --- Header --- */}
        <h1 className="mb-6 text-3xl font-bold text-text-primary">Global Search</h1>

        {/* --- Search Input Area --- */}
        <div className="p-4 rounded-xl card mb-6 border border-border">
          <Input
            id="liveSearch"
            type="text"
            placeholder="Search users by username, first name, or last name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<IoSearchOutline />}
            className="w-full"
          />
        </div>

        {/* --- Results Display --- */}
        <div className="rounded-xl card border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">
              {query ? `Results (${results.length})` : 'Recently Explored'}
            </h2>
            {!query && history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="p-4 space-y-2">
            {loading && debouncedQuery ? (
              <div className="text-center py-12"><Spinner size="lg" /></div>
            ) : error ? (
              <p className="text-red-500 text-center py-5">{error}</p>
            ) : results.length > 0 ? (
              results.map(user => (
                <SearchResultItem
                  key={user.id}
                  user={user}
                  onFollowToggle={handleFollowToggle}
                  isUpdating={updatingId === user.id}
                  onProfileClick={addToHistory}
                />
              ))
            ) : query && !loading ? (
              <p className="text-text-secondary text-center py-12">
                No users found matching "{query}".
              </p>
            ) : !query && history.length > 0 ? (
               <div className="space-y-1">
                 {history.map(user => (
                   <SearchResultItem
                     key={user.id}
                     user={user}
                     onFollowToggle={handleFollowToggle}
                     isUpdating={updatingId === user.id}
                     onProfileClick={addToHistory}
                   />
                 ))}
               </div>
            ) : (
              <p className="text-text-secondary text-center py-12">
                Start typing to find users.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SearchPage;