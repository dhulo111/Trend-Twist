import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoSearch, IoAdd, IoCheckmark } from 'react-icons/io5';
import { searchUsers } from '../../../api/userSearchApi';
import { createGroup } from '../../../api/chatApi';
import Avatar from '../../common/Avatar';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 1) {
      try {
        const results = await searchUsers(query);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed", err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async () => {
    if (!groupName || selectedUsers.length === 0) return;
    setIsLoading(true);
    try {
      const memberIds = selectedUsers.map(u => u.id);
      await createGroup(groupName, memberIds, null);
      onGroupCreated();
      onClose();
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-background-secondary rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-between items-center bg-background-primary">
            <h2 className="text-xl font-bold text-text-primary">New Group</h2>
            <button onClick={onClose} className="p-2 hover:bg-background-accent/10 rounded-full text-text-secondary">
              <IoClose size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Group Name Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Group Name</label>
              <input
                type="text"
                placeholder="Name your group..."
                className="w-full bg-background-primary border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-text-accent transition-colors"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-1 bg-text-accent/10 text-text-accent px-3 py-1 rounded-full text-sm">
                    <span>{user.username}</span>
                    <button onClick={() => toggleUser(user)}><IoClose /></button>
                  </div>
                ))}
              </div>
            )}

            {/* User Search */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Add Members</label>
              <div className="relative">
                <IoSearch className="absolute left-3 top-3 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search people..."
                  className="w-full bg-background-primary border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary focus:outline-none focus:border-text-accent transition-colors"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map(user => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-text-accent/10 border border-text-accent/30' : 'hover:bg-background-accent/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={user.profile?.profile_picture} alt={user.username} size="sm" />
                      <div>
                        <p className="font-semibold text-text-primary">{user.username}</p>
                        <p className="text-xs text-text-secondary">{user.first_name} {user.last_name}</p>
                      </div>
                    </div>
                    {isSelected ? <IoCheckmark className="text-text-accent" /> : <div className="w-5 h-5 rounded-full border border-border" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-background-primary">
            <button
              onClick={handleCreate}
              disabled={!groupName || selectedUsers.length === 0 || isLoading}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!groupName || selectedUsers.length === 0 ? 'bg-gray-500 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-text-accent to-purple-600 hover:shadow-lg hover:scale-[1.02]'}`}
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateGroupModal;
