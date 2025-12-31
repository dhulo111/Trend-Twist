// frontend/src/components/features/chat/Inbox.jsx

import React, { useState, useEffect } from 'react';
import { getChatInbox } from '../../../api/chatApi';
import Avatar from '../../common/Avatar';
import Spinner from '../../common/Spinner';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';

/**
 * Displays the list of all chat rooms (DM Inbox).
 * @param {object} props
 * @param {function} props.onSelectChat - Function to switch to a specific chat window.
 * @param {object} props.activeChat - The currently selected chat room object.
 */
const Inbox = ({ onSelectChat, activeChat, refreshTrigger }) => {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const data = await getChatInbox();
      setInbox(data);
    } catch (err) {
      setError('Failed to load inbox. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    // Set up a polling interval for live inbox updates (optional but good for basic real-time feel without global socket)
    const interval = setInterval(fetchInbox, 15000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  if (loading) {
    return <div className="p-4 text-center"><Spinner size="md" /></div>;
  }

  if (error) {
    return <p className="p-4 text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-text-primary px-4 py-3 border-b border-border">
        Messages
      </h2>

      {inbox.length === 0 ? (
        <div className="p-8 text-center text-text-secondary">
          <IoChatbubbleEllipsesOutline className="h-12 w-12 mx-auto mb-3" />
          <p>Your inbox is empty. Start a new chat!</p>
        </div>
      ) : (
        inbox.map((room) => {
          const otherUser = room.other_user;
          const isActive = activeChat?.id === room.id;
          const lastMessage = room.last_message;

          return (
            <div
              key={room.id}
              onClick={() => onSelectChat(room, otherUser)}
              className={`flex items-center p-3 space-x-3 cursor-pointer 
                          border-b border-border transition-colors
                          ${isActive ? 'bg-background-accent' : 'hover:bg-background-accent/50'}`}
            >
              <Avatar src={otherUser?.profile?.profile_picture} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">{otherUser?.username}</p>
                <p
                  className={`text-sm truncate ${room.unread_count > 0 ? 'font-bold text-text-primary' : 'text-text-secondary'}`}
                >
                  {lastMessage?.content || 'No messages yet.'}
                </p>
              </div>

              {room.unread_count > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {room.unread_count}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Inbox;