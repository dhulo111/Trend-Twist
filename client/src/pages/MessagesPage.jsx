// frontend/src/pages/MessagesPage.jsx

import React, { useState } from 'react';
import Inbox from '../components/features/chat/Inbox';
import ChatWindow from '../components/features/chat/ChatWindow';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const MessagesPage = () => {
  const location = useLocation(); // Hook for state params
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeUser, setActiveUser] = useState(null);

  // Check for navigation state (from Profile Page)
  useEffect(() => {
    if (location.state?.startChatUser) {
      // We create a temp room structure to init the chat immediately
      // In a real app, reliable way is to fetch/create room by user ID first via API
      // For simplicity, we assume we might need to find it in Inbox or passed completely
      const targetUser = location.state.startChatUser;
      setActiveUser(targetUser);
      setActiveRoom({ id: 'temp_' + targetUser.id }); // Fake ID or fetched
    }
  }, [location.state]);

  const handleSelectChat = (room, otherUser) => {
    setActiveRoom(room);
    setActiveUser(otherUser);
  };

  const [refreshKey, setRefreshKey] = useState(0);

  const handleMessageSent = () => {
    // Trigger inbox refresh to show latest message at top
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="w-full h-full flex glass-flat shadow-none my-0 mx-0 relative">
      {/* --- 1. Inbox Sidebar (Left) --- */}
      {/* Hidden on mobile if a room is active */}
      <div className={`w-full md:w-1/3 border-r border-border h-full ${activeRoom ? 'hidden md:block' : 'block'}`}>
        <Inbox
          onSelectChat={handleSelectChat}
          activeChat={activeRoom}
          refreshTrigger={refreshKey}
        />
      </div>

      {/* --- 2. Chat Window (Right) --- */}
      {/* Hidden on mobile if NO room is active */}
      <div className={`w-full md:w-2/3 h-full ${activeRoom ? 'block' : 'hidden md:block'}`}>
        {activeRoom && activeUser ? (
          <ChatWindow
            room={activeRoom}
            otherUser={activeUser}
            onBack={() => { setActiveRoom(null); setActiveUser(null); }}
            onMessageUpdate={handleMessageSent}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-text-secondary">
            <IoChatbubbleEllipsesOutline className="h-20 w-20 mb-4" />
            <h3 className="text-2xl font-bold text-text-primary">Your Messages</h3>
            <p className="mt-2">Select a conversation from the left to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;