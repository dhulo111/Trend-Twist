// frontend/src/components/features/chat/ChatWindow.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import { getChatHistory } from '../../../api/chatApi';
import { AuthContext } from '../../../context/AuthContext';
import Message from './Message';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import { IoSend, IoCallOutline, IoVideocamOutline, IoArrowBack, IoEyeOutline } from 'react-icons/io5';
import config from '../../../config';
import { useNavigate } from 'react-router-dom';

/**
 * Manages the live WebSocket connection and message history for a single chat.
 * @param {object} props
 * @param {object} props.room - The ChatRoom object.
 * @param {object} props.otherUser - The user object of the chat partner.
 * @param {function} props.onMessageUpdate - Callback to trigger inbox refresh.
 */
const ChatWindow = ({ room, otherUser, onBack, onMessageUpdate }) => {
  const { authToken, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('Connecting...');

  // User Presence State
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

  // --- 1. Fetch History on Load ---
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const history = await getChatHistory(otherUser.id);
        setMessages(history);
      } catch (e) {
        setMessages([]);
        console.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [otherUser.id]);

  // --- 2. WebSocket Connection Logic ---
  useEffect(() => {
    // Determine WS Host dynamically
    let wsProtocol = 'ws:';
    let wsHost = '127.0.0.1:8000';

    // Try to parse from API_BASE_URL first
    try {
      const url = new URL(config.API_BASE_URL);
      wsHost = url.host;
      wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    } catch (e) {
      // Fallback to window location if running same origin, or default
      if (window.location.hostname !== 'localhost') {
        wsHost = window.location.host;
        wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      }
    }

    // Connect to the specific user's chat consumer
    // Pass token in Query Param for backend JwtAuthMiddleware
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${otherUser.id}/?token=${authToken.access}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Attach event handlers
    ws.onopen = () => {
      setWsStatus('Connected.');
      // Send initial read receipt
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 'type': 'mark_read' }));
      }
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'user_status') {
        if (data.username === otherUser.username) {
          setIsOnline(data.is_online);
          setLastSeen(data.last_seen);
        }
      } else if (data.type === 'message_read') {
        // Mark all local messages as read
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      } else if (data.type === 'chat_message') {
        // Standard message
        setMessages((prevMessages) => [...prevMessages, data]);

        // If we received a message from them, mark it as read immediately if window is open
        if (data.author_username === otherUser.username) {
          ws.send(JSON.stringify({ 'type': 'mark_read' }));
        }

        if (onMessageUpdate) onMessageUpdate();
      } else if (data.type === 'message_updated') {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: data.content } : m));
      } else if (data.type === 'message_deleted') {
        setMessages(prev => prev.filter(m => m.id !== data.id));
      }
    };

    ws.onclose = () => {
      setWsStatus('Disconnected. Attempting to reconnect...');
    };

    ws.onerror = (e) => {
      setWsStatus('Connection Error.');
      console.error('WebSocket Error:', e);
    };

    // Cleanup function: Close the WebSocket when the component unmounts
    return () => {
      ws.close();
    };
  }, [otherUser.id, authToken]); // Reconnect when chat partner changes or token changes

  // --- 3. Scroll to Bottom Effect ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]); // Scroll when messages or loading state changes

  // --- 4. Send Message Handler ---
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;

    // Send the message via WebSocket
    wsRef.current.send(JSON.stringify({
      'message': newMessage,
    }));

    // Optimistically trigger inbox refresh for "You: ..." update
    if (onMessageUpdate) onMessageUpdate();

    setNewMessage('');
    setNewMessage('');
  };

  const handleEditMessage = (id, newContent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit_message',
        id: id,
        content: newContent
      }));
    }
  };

  const handleDeleteMessage = (id) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_message',
        id: id
      }));
    }
  };

  // --- Render ---
  return (
    <div className="flex h-full flex-col">
      {/* --- Chat Header --- */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-glass-bg backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          {/* Mobile Back Button */}
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-text-primary">
            <IoArrowBack size={24} />
          </button>

          <Avatar src={otherUser.profile?.profile_picture} size="md" />
          <div
            className="flex flex-col cursor-pointer hover:opacity-80 transition"
            onClick={() => navigate(`/profile/${otherUser.username}`)}
          >
            <p className="font-semibold text-text-primary text-sm md:text-base">{otherUser.username}</p>
            {isOnline ? (
              <p className="text-xs text-green-500 font-bold">Active now</p>
            ) : (
              <p className="text-xs text-text-secondary">
                {lastSeen ? `Active ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
              </p>
            )}
          </div>
        </div>

        {/* Call Buttons (Placeholder) */}
        <div className="flex space-x-3">
          <Button variant="secondary" size="sm" leftIcon={<IoCallOutline />}>Call</Button>
          <Button variant="secondary" size="sm" leftIcon={<IoVideocamOutline />}>Video</Button>
        </div>
      </div>

      {/* --- Message History --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="flex flex-col">
              <Message
                message={msg}
                currentUsername={user?.username}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
              {/* Show Seen Indicator for the LAST message sent by ME if it is read */}
              {index === messages.length - 1 && msg.author_username === user?.username && msg.is_read && (
                <div className="flex justify-end pr-2 mt-1">
                  <span className="text-xs text-text-secondary flex items-center">
                    Seen <IoEyeOutline className="ml-1" />
                  </span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} /> {/* Scroll target */}
      </div>

      {/* --- Message Input --- */}
      <form onSubmit={handleSend} className="flex items-center border-t border-border p-4">
        <Input
          id="chatInput"
          type="text"
          placeholder="Send a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 mr-3"
        />
        <Button type="submit" disabled={!newMessage.trim()}>
          <IoSend className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;