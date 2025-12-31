// frontend/src/components/features/search/SearchModal.jsx

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import Input from '../../common/Input';
import Avatar from '../../common/Avatar';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Tooltip from '../../common/Tooltip';
import { IoSearchOutline, IoLockClosed, IoPersonAddOutline } from 'react-icons/io5';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce'; // Assuming this custom hook is defined
import { toggleFollow, searchUsers } from '../../../api/userSearchApi'; // <-- Import functions directly

// --- Sub-Component: Search Result Item ---

const SearchResultItem = ({ user, onFollowToggle, isUpdating }) => {
  const isPrivate = user.profile?.is_private;
  const isFollowing = user.is_following;
  const hasPendingRequest = user.has_pending_request;
  const navigate = useNavigate();

  // Determine button state based on user status
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
    // Close modal when navigating to profile (optional UX improvement)
    // NOTE: This assumes onClose is passed down or SearchModal manages it.
    navigate(`/profile/${user.username}`);
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-background-accent/50 transition-colors">
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
      >
        {isUpdating ? <Spinner size="sm" /> : buttonText}
      </Button>
    </div>
  );
};

// --- Main Component: SearchModal ---

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null); // Tracks which user's button is loading

  const debouncedQuery = useDebounce(query, 500);

  // --- Search Logic ---
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchUsers(debouncedQuery);
        setResults(data);
      } catch (err) {
        setError('Failed to search users.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    searchUsers();
  }, [debouncedQuery]);

  // --- Optimized Follow Toggle Logic ---
  const handleFollowToggle = async (userId) => {
    setUpdatingId(userId);
    setError(null);

    try {
      // API call
      const response = await toggleFollow(userId);
      const status = response.status; // e.g., 'followed', 'request_sent', 'unfollowed', 'request_cancelled'

      // OPTIMISTIC/DIRECT STATE UPDATE
      setResults(prevResults => prevResults.map(user => {
        if (user.id === userId) {
          // Create a new user object based on the new status
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search TrendTwist"
      className="max-w-xl h-full md:h-auto md:max-h-[80vh] flex flex-col"
    >
      <div className="p-4 border-b border-border">
        <Input
          id="search"
          type="text"
          placeholder="Search for username or full name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<IoSearchOutline />}
          className="w-full"
        />
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center py-12"><Spinner size="lg" /></div>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : results.length > 0 ? (
          results.map(user => (
            <SearchResultItem
              key={user.id}
              user={user}
              onFollowToggle={handleFollowToggle}
              isUpdating={updatingId === user.id} // Pass updating state
            />
          ))
        ) : debouncedQuery && !loading ? (
          <p className="text-text-secondary text-center py-12">
            No users found matching "{debouncedQuery}".
          </p>
        ) : (
          <p className="text-text-secondary text-center py-12">
            Start typing to search users across the network.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default SearchModal;