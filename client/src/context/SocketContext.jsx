import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import api from '../api/axiosInstance';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, authToken } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Connect to WebSocket
  useEffect(() => {
    if (user && authToken?.access) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:8000/ws/notifications/?token=${authToken.access}`;

      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log("Notification Socket Connected");
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'notification_message') {
            const notifData = message.data;

            // Handle Deletion Event
            if (notifData.action === 'deleted') {
              setNotifications(prev => prev.filter(n => n.id !== notifData.id));
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
              // Handle New or Update
              setNotifications(prev => {
                const exists = prev.find(n => n.id === notifData.id);
                if (exists) {
                  // UPDATE existing
                  return prev.map(n => n.id === notifData.id ? notifData : n);
                } else {
                  // INSERT new
                  // (We also increment unread count here, assuming new ones are unread)
                  setUnreadCount(c => c + 1);
                  return [notifData, ...prev];
                }
              });
            }
          }
        } catch (e) {
          console.error("Socket message error", e);
        }
      };

      newSocket.onclose = () => console.log("Notification Socket Disconnected");

      setSocket(newSocket);

      // Fetch initial notifications
      fetchNotifications();

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) socket.close();
      setSocket(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, authToken]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (e) { console.error("Failed to fetch notifications", e); }
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, fetchNotifications, markAsRead, removeNotification }}>
      {children}
    </SocketContext.Provider>
  );
};
