// frontend/src/pages/MessagesPage.jsx

import React, { useState } from 'react';
import Inbox from '../components/features/chat/Inbox';
import ChatWindow from '../components/features/chat/ChatWindow';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const MessagesPage = () => {
  const location = useLocation();
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check for navigation state (from Profile Page)
  useEffect(() => {
    if (location.state?.startChatUser) {
      const targetUser = location.state.startChatUser;
      setActiveUser(targetUser);
      setActiveRoom({ id: 'temp_' + targetUser.id });
      setIsGroupChat(false);
    }
  }, [location.state]);

  const handleSelectChat = (room, otherUser, isGroup = false) => {
    setActiveRoom(room);
    setActiveUser(otherUser);
    setIsGroupChat(isGroup);
  };

  const handleMessageSent = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="w-full h-full flex glass-flat shadow-none my-0 mx-0 relative bg-background-primary text-text-primary rounded-xl overflow-hidden border border-border">
      {/* --- 1. Inbox Sidebar (Left) --- */}
      <div className={`w-full md:w-1/3 border-r border-border h-full ${activeRoom ? 'hidden md:block' : 'block'}`}>
        <Inbox
          onSelectChat={handleSelectChat}
          activeChat={activeRoom}
          refreshTrigger={refreshKey}
        />
      </div>

      {/* --- 2. Chat Window (Right) --- */}
      <div className={`w-full md:w-2/3 h-full ${activeRoom ? 'block' : 'hidden md:block bg-background-secondary/30'}`}>
        {activeRoom ? (
          <ChatWindow
            room={activeRoom}
            otherUser={activeUser}
            activeChat={activeRoom}
            isGroup={isGroupChat}
            onBack={() => { setActiveRoom(null); setActiveUser(null); setIsGroupChat(false); }}
            onMessageUpdate={handleMessageSent}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-text-secondary">
            <IoChatbubbleEllipsesOutline className="h-20 w-20 mb-4 opacity-50" />
            <h3 className="text-2xl font-bold text-text-primary">Your Messages</h3>
            <p className="mt-2 text-lg">Send private photos and messages to a friend or group.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;