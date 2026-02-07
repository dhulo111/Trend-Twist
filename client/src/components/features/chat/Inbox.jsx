// frontend/src/components/features/chat/Inbox.jsx

import React, { useState, useEffect } from 'react';
import { getChatInbox, getGroups } from '../../../api/chatApi'; // Import getGroups
import Avatar from '../../common/Avatar';
import Spinner from '../../common/Spinner';
import CreateGroupModal from './CreateGroupModal'; // Import CreateGroupModal
import { IoChatbubbleEllipsesOutline, IoAdd, IoPeople } from 'react-icons/io5';

/**
 * Displays the list of all chat rooms (DM Inbox) and Groups.
 * @param {object} props
 * @param {function} props.onSelectChat - Function to switch to a specific chat window.
 * @param {object} props.activeChat - The currently selected chat room object.
 */
const Inbox = ({ onSelectChat, activeChat, refreshTrigger }) => {
  const [inbox, setInbox] = useState([]);
  const [groups, setGroups] = useState([]); // State for groups
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'dms', 'groups'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inboxData, groupsData] = await Promise.all([getChatInbox(), getGroups()]);
      setInbox(inboxData);
      setGroups(groupsData);
    } catch (err) {
      setError('Failed to load messages. Check connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleGroupCreated = () => {
    fetchData();
  };

  const renderItem = (item, type) => {
    const isGroup = type === 'group';
    const isActive = activeChat?.id === item.id && (isGroup ? activeChat.isGroup : !activeChat.isGroup);
    const name = isGroup ? item.name : item.other_user?.username;
    const avatarSrc = isGroup ? item.icon : item.other_user?.profile?.profile_picture;
    const lastMsg = item.last_message?.content || 'No messages yet.';

    return (
      <div
        key={`${type}-${item.id}`}
        onClick={() => onSelectChat(item, isGroup ? null : item.other_user, isGroup)}
        className={`flex items-center p-3 space-x-3 cursor-pointer 
                      border-b border-border transition-colors
                      ${isActive ? 'bg-background-accent' : 'hover:bg-background-accent/50'}
                      ${item.unread_count > 0 ? 'bg-background-accent/10' : ''}`}
      >
        {isGroup ? (
          avatarSrc ?
            <img src={avatarSrc} alt={name} className="w-12 h-12 rounded-full object-cover border border-border" /> :
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold border border-border">
              <IoPeople size={24} />
            </div>
        ) : (
          <Avatar src={avatarSrc} size="md" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className="font-semibold text-text-primary truncate">{name}</p>
            {item.last_message_at && (
              <span className="text-xs text-text-secondary whitespace-nowrap ml-2">
                {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className={`text-sm truncate ${item.unread_count > 0 ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
            {isGroup && item.last_message ? <span className="text-text-accent mr-1">{item.last_message.author_username}:</span> : null}
            {lastMsg}
          </p>
        </div>

        {item.unread_count > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center">
            {item.unread_count}
          </span>
        )}
      </div>
    );
  };

  if (loading && inbox.length === 0 && groups.length === 0) {
    return <div className="p-4 text-center"><Spinner size="md" /></div>;
  }

  const allItems = [
    ...inbox.map(i => ({ ...i, type: 'dm', sortTime: new Date(i.last_message_at).getTime() })),
    ...groups.map(g => ({ ...g, type: 'group', sortTime: new Date(g.last_message_at).getTime() }))
  ].sort((a, b) => b.sortTime - a.sortTime);

  const displayedItems = activeTab === 'all' ? allItems : activeTab === 'groups' ? allItems.filter(i => i.type === 'group') : allItems.filter(i => i.type === 'dm');

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center bg-background-secondary/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-text-primary">Messages</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 rounded-full bg-text-accent/10 text-text-accent hover:bg-text-accent/20 transition-colors"
          title="Create Group"
        >
          <IoAdd size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-border bg-background-primary sticky top-[73px] z-10">
        {['all', 'dms', 'groups'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === tab ? 'bg-text-accent text-white' : 'text-text-secondary hover:bg-background-accent/10'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayedItems.length === 0 ? (
          <div className="p-8 text-center text-text-secondary flex flex-col items-center">
            <IoChatbubbleEllipsesOutline className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">No messages found.</p>
            <p className="text-sm opacity-70">Start a chat or create a group!</p>
          </div>
        ) : (
          displayedItems.map(item => renderItem(item, item.type))
        )}
      </div>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default Inbox;