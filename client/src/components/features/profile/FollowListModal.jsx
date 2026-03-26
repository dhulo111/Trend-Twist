// frontend/src/components/features/profile/FollowListModal.jsx

import React, { useState, useEffect, useContext } from 'react';
import { getFollowers, getFollowing, getSubscribers, toggleFollow } from '../../../api/userApi';
import Modal from '../../common/Modal';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import Button from '../../common/Button';
import { Link } from 'react-router-dom';
import { IoPersonOutline, IoPersonAddOutline, IoCheckmarkOutline, IoArrowBackOutline, IoSearchOutline } from 'react-icons/io5';
import { AuthContext } from '../../../context/AuthContext';

const UserListItem = ({ user, onClose }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [isFollowing, setIsFollowing] = useState(user.is_following);
  const [loading, setLoading] = useState(false);

  // Don't show follow button for self
  const isSelf = currentUser && currentUser.id === user.id;

  const handleFollowClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || loading) return;

    setLoading(true);
    try {
      await toggleFollow(user.id);
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-background-accent transition-all animate-in fade-in duration-300">
      <Link
        to={`/profile/${user.username}`}
        onClick={onClose}
        className="flex items-center space-x-4 flex-grow"
      >
        <div className="relative group">
          <Avatar src={user.profile?.profile_picture} alt={user.username} size="lg" className="border-2 border-border group-hover:border-text-accent transition-colors" />
          {user.profile?.is_trendsetter && (
             <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-1 border-2 border-background-secondary shadow-lg">
                <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
             </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <p className="font-black text-sm tracking-tight text-text-primary">@{user.username}</p>
          </div>
          <p className="text-xs text-text-secondary font-medium">{user.first_name || 'User'} {user.last_name || ''}</p>
        </div>
      </Link>

      {!isSelf && (
        <Button
          size="sm"
          variant={isFollowing ? "secondary" : "primary"}
          onClick={handleFollowClick}
          className={`min-w-[100px] h-10 rounded-full font-bold text-xs uppercase tracking-widest ${isFollowing ? 'bg-background-accent/80 border-border' : 'bg-text-accent text-black hover:bg-text-accent/90'}`}
          leftIcon={isFollowing ? <IoCheckmarkOutline /> : <IoPersonAddOutline />}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" /> : (isFollowing ? 'Following' : 'Follow')}
        </Button>
      )}
    </div>
  );
};

const FollowListModal = ({ isOpen, onClose, type, username }) => {
  const [activeTab, setActiveTab] = useState(type || 'followers');
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs Configuration
  const tabs = [
    { id: 'followers', label: 'Followers' },
    { id: 'following', label: 'Following' },
    { id: 'subscribers', label: 'Subscribers' },
  ];

  useEffect(() => {
    if (isOpen && type) {
      setActiveTab(type);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (!isOpen || !username) return;

    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        // The APIs are now consistent (returning User objects)
        if (activeTab === 'followers') data = await getFollowers(username);
        else if (activeTab === 'following') data = await getFollowing(username);
        else data = await getSubscribers(username);

        setList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Connection fetch error:", e);
        setError(`Failed to load ${activeTab}. User may not exist or network is offline.`);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [isOpen, username, activeTab]);

  useEffect(() => {
    if (!isOpen) {
      setList([]);
      setError(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredList = list.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
             <Spinner size="xl" />
             <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                <IoPersonOutline className="text-text-secondary h-6 w-6" />
             </div>
          </div>
          <p className="text-text-secondary font-black text-xs tracking-widest animate-pulse">SYNCING DATA...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <IoAlertCircleOutline className="text-red-500 text-5xl mb-4" />
          <p className="text-text-primary font-bold mb-4">{error}</p>
          <Button variant="secondary" size="md" className="rounded-full" onClick={onClose}>Dismiss</Button>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
          <div className="w-24 h-24 bg-background-accent/50 rounded-full flex items-center justify-center mb-6 text-text-secondary/40 border border-border">
            <IoPersonOutline className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-black text-text-primary mb-2 uppercase tracking-tight">No {activeTab} yet</h3>
          <p className="text-text-secondary text-sm max-w-xs font-medium">
            When {username} builds connections, they will show up here.
          </p>
        </div>
      );
    }

    return (
      <div className="px-4 pb-20 animate-in slide-in-from-bottom-2 duration-500">
        {/* Search Bar inside Modal */}
        <div className="mb-4 relative">
           <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
           <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              className="w-full h-12 bg-background-accent border border-border rounded-2xl pl-12 pr-4 text-sm font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-accent/50 selection:bg-text-accent selection:text-black transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>

        <div className="space-y-1">
          {filteredList.length > 0 ? (
            filteredList.map((userData) => (
              <UserListItem 
                key={userData.id} 
                user={userData} 
                onClose={onClose} 
              />
            ))
          ) : (
            <div className="text-center py-12 text-text-secondary text-sm font-bold">No results found for "{searchQuery}"</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={true}
      hideHeader={true}
      className="bg-background-secondary"
      // Header is handled by the custom div below
    >
      <div className="h-full flex flex-col bg-background-primary">
        {/* CUSTOM MODAL HEADER (Back Button + Centered Title) */}
        <div className="sticky top-0 z-40 bg-background-primary/90 backdrop-blur-xl border-b border-border">
          <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-[70px]">
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-background-accent transition-colors"
            >
              <IoArrowBackOutline className="h-6 w-6 text-text-primary" />
            </button>
            
            <h2 className="text-sm font-black tracking-widest text-text-primary uppercase">Connections</h2>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* INTERNAL MODAL TABS */}
          <div className="max-w-xl mx-auto flex justify-between">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-4 px-1 text-center font-black text-[11px] tracking-widest transition-all relative uppercase
                  ${activeTab === tab.id ? 'text-text-accent' : 'text-text-secondary hover:text-text-primary'}
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-text-accent rounded-t-full shadow-[0_-2px_12px_rgba(var(--accent-rgb),0.6)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow max-w-xl mx-auto w-full pt-6">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
};

export default FollowListModal;