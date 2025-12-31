import React, { useState, useEffect } from 'react';
import { IoClose, IoSearch, IoPaperPlane } from 'react-icons/io5';
import { searchUsers } from '../../../api/userApi';
import { shareReel } from '../../../api/reelApi';
import Avatar from '../../common/Avatar';
import { AnimatePresence, motion } from 'framer-motion';

const ShareReelModal = ({ isOpen, onClose, reelId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      const delayDebounceFn = setTimeout(async () => {
        try {
          const data = await searchUsers(query);
          setResults(data);
        } catch (error) {
          console.error("Search failed", error);
        }
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setResults([]);
    }
  }, [query]);

  const toggleSelect = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) return;
    setSending(true);
    try {
      await shareReel(reelId, selectedUsers.map(u => u.id));
      onClose();
      // Optional: Show toast success
      alert("Reel sent!");
    } catch (error) {
      console.error("Failed to share", error);
      alert("Failed to send.");
    } finally {
      setSending(false);
      setSelectedUsers([]);
      setQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Share Reel</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <IoClose size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-text-accent"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {query.length < 3 && results.length === 0 && (
            <div className="text-center text-white/40 py-10">Type name to search...</div>
          )}

          {results.map(user => {
            const isSelected = selectedUsers.find(u => u.id === user.id);
            return (
              <div
                key={user.id}
                onClick={() => toggleSelect(user)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-text-accent/20 border border-text-accent/50' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar src={user.profile.profile_picture} size="sm" />
                  <div>
                    <p className="text-white font-medium text-sm">{user.username}</p>
                    <p className="text-white/50 text-xs">{user.first_name} {user.last_name}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-text-accent border-text-accent' : 'border-white/30'}`}>
                  {isSelected && <IoPaperPlane className="text-white text-xs" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Send Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSend}
            disabled={selectedUsers.length === 0 || sending}
            className="w-full bg-text-accent hover:bg-text-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {sending ? 'Sending...' : `Send to ${selectedUsers.length > 0 ? selectedUsers.length + ' people' : ''}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ShareReelModal;
