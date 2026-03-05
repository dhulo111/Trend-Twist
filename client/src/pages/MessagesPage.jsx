// frontend/src/pages/MessagesPage.jsx

import React, { useState } from 'react';
import Inbox from '../components/features/chat/Inbox';
import ChatWindow from '../components/features/chat/ChatWindow';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useEffect } from 'react';
import { getUserProfile } from '../api/userApi'; // Import getUserProfile

const MessagesPage = () => {
  const location = useLocation();
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [targetGroupId, setTargetGroupId] = useState(null); // To auto-select group in Inbox
  const navigate = useNavigate();

  // Check for navigation state (from Profile Page or Toast)
  useEffect(() => {
    const handleNavigation = async () => {
      if (location.state?.startChatUser) {
        const targetUser = location.state.startChatUser;
        setActiveUser(targetUser);
        setActiveRoom({ id: 'temp_' + targetUser.id });
        setIsGroupChat(false);
        // Clear state to prevent re-trigger on refresh/navigation back
        navigate({ ...location, state: {} }, { replace: true });
      } else if (location.state?.openUser) {
        // From Toast: Username
        try {
          const username = location.state.openUser;
          const userProfile = await getUserProfile(username); // Fetch full user object
          setActiveUser(userProfile);
          setActiveRoom({ id: 'temp_' + userProfile.id });
          setIsGroupChat(false);
          navigate({ ...location, state: {} }, { replace: true });
        } catch (e) {
          console.error("Failed to open chat with user:", e);
        }
      } else if (location.state?.openGroup) {
        // From Toast: Group ID
        setTargetGroupId(location.state.openGroup);
        setIsGroupChat(true); // Hint
        navigate({ ...location, state: {} }, { replace: true });
      }
    };
    handleNavigation();
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
          autoSelectGroupId={targetGroupId} // Pass target group ID
          onAutoSelectHandled={() => setTargetGroupId(null)}
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