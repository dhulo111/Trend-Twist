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
    <div className="flex items-center justify-between p-3 sm:p-4 mb-2 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
      <Link
        to={`/profile/${user.username}`}
        onClick={onClose}
        className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0"
      >
        <div className="relative flex-shrink-0">
          <Avatar src={user.profile?.profile_picture} alt={user.username} size="lg" className="ring-2 ring-white/5 group-hover:ring-text-accent/50 transition-all" />
          {user.profile?.is_trendsetter && (
             <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-1 border-2 border-background-secondary shadow-lg">
                <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
             </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-bold text-sm sm:text-base text-text-primary truncate">@{user.username}</p>
          <p className="text-xs sm:text-sm text-text-secondary truncate font-medium">{user.first_name || 'User'} {user.last_name || ''}</p>
        </div>
      </Link>

      {!isSelf && (
        <Button
          size="sm"
          variant={isFollowing ? "secondary" : "primary"}
          onClick={handleFollowClick}
          className={`
            min-w-[90px] h-9 sm:h-10 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider
            transition-all active:scale-95 flex-shrink-0 ml-2
            ${isFollowing 
              ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' 
              : 'bg-text-accent text-black hover:bg-text-accent/90 shadow-lg shadow-text-accent/20'}
          `}
          leftIcon={isFollowing ? <IoCheckmarkOutline size={14} /> : <IoPersonAddOutline size={14} />}
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
        if (activeTab === 'followers') data = await getFollowers(username);
        else if (activeTab === 'following') data = await getFollowing(username);
        else data = await getSubscribers(username);

        setList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Connection fetch error:", e);
        setError(`Failed to load ${activeTab}.`);
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
          <Spinner size="xl" />
          <p className="text-text-secondary font-black text-xs tracking-widest animate-pulse uppercase">Syncing Connections...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-red-500/5 rounded-3xl border border-red-500/10 mx-4">
          <p className="text-text-primary font-bold mb-4">{error}</p>
          <Button variant="secondary" size="md" className="rounded-full" onClick={onClose}>Dismiss</Button>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-text-secondary/40 border border-white/5">
            <IoPersonOutline className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-text-primary mb-2 uppercase tracking-tight">No {activeTab} yet</h3>
          <p className="text-text-secondary text-sm max-w-[240px] font-medium mx-auto">
            When connections are made, they will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="px-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Search Bar */}
        <div className="mb-6 relative group">
           <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-text-accent transition-colors" />
           <input 
              type="text" 
              placeholder={`Search in ${activeTab}...`}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold placeholder:text-text-secondary/60 focus:outline-none focus:bg-white/10 focus:border-text-accent/30 focus:ring-4 focus:ring-text-accent/5 transition-all"
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
            <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10 text-text-secondary text-sm font-bold">
              No connections match "{searchQuery}"
            </div>
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
      className="bg-background-primary"
    >
      <div className="min-h-screen flex flex-col bg-background-primary">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-background-primary/80 backdrop-blur-2xl border-b border-white/5">
          <div className="w-full max-w-2xl mx-auto flex items-center justify-between px-4 h-16 sm:h-20">
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90"
            >
              <IoArrowBackOutline className="h-6 w-6 text-text-primary" />
            </button>
            
            <h2 className="text-sm sm:text-base font-black tracking-[0.2em] text-text-primary uppercase pl-6">Connections</h2>
            
            <div className="w-10" />
          </div>

          {/* Persistent Tabs */}
          <div className="w-full max-w-2xl mx-auto flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-4 text-center font-black text-[10px] sm:text-[11px] tracking-widest transition-all relative uppercase
                  ${activeTab === tab.id ? 'text-text-accent' : 'text-text-secondary hover:text-text-primary'}
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-text-accent rounded-t-full shadow-[0_-4px_16px_rgba(var(--accent-rgb),0.8)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable List */}
        <main className="flex-1 w-full max-w-2xl mx-auto pt-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </Modal>
  );
};

export default FollowListModal;