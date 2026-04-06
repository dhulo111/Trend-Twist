import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import api from '../api/axiosInstance';
import Toast from '../components/common/Toast';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import CallInterface from '../components/features/chat/CallInterface';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, authToken } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  // --- Global Calling State ---
  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState('video');
  const [otherUser, setOtherUser] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (e) {
      console.error("Notif fetch failure", e);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.post(`/notifications/${id}/read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const updateNotification = useCallback((id, data) => {
    setNotifications(prev => prev.map(notif => {
      if (notif.id === id) {
        if (data.is_read === true && notif.is_read === false) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return { ...notif, ...data };
      }
      return notif;
    }));
  }, []);

  // Connect to WebSocket

  useEffect(() => {
    if (!user || !authToken?.access) return;

    let reconnectTimeout;
    let isMounted = true;
    let newSocket;

    const connect = () => {
      if (!isMounted) return;

      let wsProtocol = 'ws:';
      let wsHost = '127.0.0.1:8000';

      try {
        const url = new URL(config.API_BASE_URL);
        wsHost = url.host;
        wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      } catch (e) {
        if (window.location.hostname !== 'localhost') {
          wsHost = window.location.host;
          wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        }
      }

      const wsUrl = `${wsProtocol}//${wsHost}/ws/notifications/?token=${authToken.access}`;
      newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('[SocketContext] Global Feed Active');
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // 1. Regular Notifications
          if (message.type === 'notification_message') {
            const notifData = message.data;
            if (notifData.action === 'deleted') {
              setNotifications(prev => prev.filter(n => n.id !== notifData.id));
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
              setNotifications(prev => {
                const exists = prev.find(n => n.id === notifData.id);
                if (exists) return prev.map(n => n.id === notifData.id ? notifData : n);
                setUnreadCount(c => c + 1);
                return [notifData, ...prev];
              });
            }
          } 
          // 2. Chat Toasts
          else if (message.type === 'chat_alert') {
            setToasts(prev => [...prev, { id: Date.now(), ...message.data }]);
          }
          // 3. GLOBAL CALLING SIGNAL (CRITICAL FIX)
          else if (message.type === 'call_signal') {
            console.log('[Socket] Incoming broadcast call signal:', message.data.type);
            const data = message.data;
            if (data.type === 'call_offer') {
              // Trigger ringing screen globally
              setIncomingCallData(data);
              setCallType(data.callType);
              setOtherUser({
                id: message.caller_id,
                username: message.caller_username
              });
              setCallStatus('incoming');
            } else if (data.type === 'call_ended') {
              setCallStatus('idle');
              setIncomingCallData(null);
              if (localStream) {
                localStream.getTracks().forEach(t => t.stop());
                setLocalStream(null);
              }
            }
          }
        } catch (e) {
          console.error('[SocketContext] Relay error:', e);
        }
      };

      newSocket.onclose = (e) => {
        if (!isMounted || e.code === 1000) return;
        reconnectTimeout = setTimeout(connect, 3000);
      };

      setSocket(newSocket);
    };

    connect();
    fetchNotifications();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (newSocket) newSocket.close(1000);
      setSocket(null);
    };
  }, [user, authToken, fetchNotifications]);



  const onAcceptCall = async () => {
    // Navigate to the chat page so ChatWindow can take over the WebRTC handshake
    setCallStatus('idle'); // Hand over to ChatWindow
    navigate('/messages', { state: { 
      openUser: otherUser.username,
      incomingCall: incomingCallData
    }});
  };

  const onRejectCall = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'reject_call', caller_id: otherUser.id }));
    }
    setCallStatus('idle');
    setIncomingCallData(null);
  };


  return (
    <SocketContext.Provider value={{ 
      socket, 
      notifications, 
      unreadCount, 
      fetchNotifications, 
      markAsRead, 
      markAllAsRead, 
      removeNotification, 
      updateNotification 
    }}>
      {children}
      
      {/* GLOBAL CALL INTERFACE (Ringing Screen) */}
      <AnimatePresence>
        {callStatus === 'incoming' && (
          <CallInterface
            callStatus="incoming"
            callType={callType}
            otherUser={otherUser}
            onAccept={onAcceptCall}
            onReject={onRejectCall}
            onEnd={onRejectCall}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toasts.length > 0 && (
          <Toast
            key={toasts[toasts.length - 1].id}
            message={toasts[toasts.length - 1]}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toasts[toasts.length - 1].id))}
            onClick={() => {
              const t = toasts[toasts.length - 1];
              navigate('/messages', { state: t.group_id ? { openGroup: t.group_id } : { openUser: t.sender } });
            }}
          />
        )}
      </AnimatePresence>
    </SocketContext.Provider>
  );
};
