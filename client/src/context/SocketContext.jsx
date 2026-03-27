import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import api from '../api/axiosInstance';
import Toast from '../components/common/Toast';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import config from '../config';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, authToken } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  // Connect to WebSocket
  useEffect(() => {
    let reconnectTimeout;
    let newSocket;

    const connect = () => {
      if (!user || !authToken?.access) return;

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
        console.log("Notification Socket Connected");
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
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
          } else if (message.type === 'chat_alert') {
            setToasts(prev => [...prev, { id: Date.now(), ...message.data }]);
          }
        } catch (e) {
          console.error("Socket message error", e);
        }
      };

      newSocket.onclose = (e) => {
        console.log("Notification Socket Disconnected", e.code, e.reason);
        // Attempt to reconnect if still logged in
        if (user && authToken?.access) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      setSocket(newSocket);
    };

    connect();
    fetchNotifications();

    return () => {
      if (newSocket) newSocket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, authToken]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (e) { console.error("Failed to fetch notifications", e); }
  };

  const updateNotification = (id, updates) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    if (updates.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAsRead = (id) => updateNotification(id, { is_read: true });

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all notifications as read", e);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addToast = (data) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...data }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (toast) => {
    removeToast(toast.id);
    if (toast.group_id) {
      // Navigate to group chat (assuming MessagesPage handles generic /messages or query params)
      // Ideally: /messages?group=123 or just /messages and let user find it?
      // Let's assume MessagesPage is the inbox.
      // Or if you have deep linking: /messages/group/:id or /messages?chat=group_123
      // The current routing seems to only have /messages.
      // We can push state or query param.
      navigate('/messages', { state: { openGroup: toast.group_id } });
    } else {
      // Navigate to DM
      navigate('/messages', { state: { openUser: toast.sender } }); // sender is username
    }
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, removeNotification, updateNotification }}>
      {children}
      <AnimatePresence>
        {toasts.length > 0 && (
          <Toast
            key={toasts[toasts.length - 1].id}
            message={toasts[toasts.length - 1]}
            onClose={() => removeToast(toasts[toasts.length - 1].id)}
            onClick={() => handleToastClick(toasts[toasts.length - 1])}
          />
        )}
      </AnimatePresence>
    </SocketContext.Provider>
  );
};
