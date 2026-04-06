import React, { useContext, useEffect } from 'react';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Spinner from '../components/common/Spinner';
import Avatar from '../components/common/Avatar';
import { IoHeart, IoPersonAdd, IoChatbubble, IoCheckmark, IoClose } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const { user } = useContext(AuthContext);
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, removeNotification, updateNotification, unreadCount } = useContext(SocketContext);
  const navigate = useNavigate();

  // Initial fetch is handled by SocketProvider, but we can ensure it's fresh
  useEffect(() => {
    fetchNotifications();
    // When viewing this page, mark all as read
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, []);

  const handleAction = async (id, action) => {
    // Optimistic Update
    const newType = action === 'accept_follow' ? 'req_approved' : 'req_rejected';

    // Immediately update local state to show "Approved" or "Rejected"
    updateNotification(id, {
      notification_type: newType,
      is_read: true
    });

    try {
      await api.post(`/notifications/${id}/${action}/`);
    } catch (e) {
      console.error(`Failed to ${action}`, e);
      // If error (e.g. 404), maybe remove it or revert?
      if (e.response && e.response.status === 404) {
        removeNotification(id);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-4 px-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-sm font-medium text-text-accent hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-text-secondary text-center py-10">No notifications yet.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onAction={handleAction}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NotificationItem = ({ notification, onAction, navigate }) => {
  let icon = null;
  let text = "";
  let link = null;

  switch (notification.notification_type) {
    case 'like_post':
      icon = <IoHeart className="text-red-500" />;
      text = "liked your post.";
      link = `/post/${notification.post}`;
      break;
    case 'like_reel':
      icon = <IoHeart className="text-red-500" />;
      text = "liked your reel.";
      link = `/reels`; 
      break;
    case 'like_twist':
      icon = <IoHeart className="text-red-500" />;
      text = "liked your twist.";
      link = `/twists`; 
      break;
    case 'follow_request':
      icon = <IoPersonAdd className="text-blue-500" />;
      text = "requested to follow you.";
      break;
    case 'follow_accept':
      icon = <IoPersonAdd className="text-green-500" />;
      text = "accepted your follow request.";
      break;
    case 'req_approved':
      icon = <IoCheckmark className="text-green-500" />;
      text = "You approved their follow request.";
      break;
    case 'req_rejected':
      icon = <IoClose className="text-red-500" />;
      text = "You rejected their follow request.";
      break;
    case 'comment_post':
      icon = <IoChatbubble className="text-green-500" />;
      text = "commented on your post.";
      link = `/post/${notification.post}`;
      break;
    case 'comment_reel':
      icon = <IoChatbubble className="text-green-500" />;
      text = "commented on your reel.";
      link = `/reels`;
      break;
    case 'comment_twist':
      icon = <IoChatbubble className="text-green-500" />;
      text = "commented on your twist.";
      link = `/twists`;
      break;
    case 'story_like':
      icon = <IoHeart className="text-pink-500" />;
      text = "liked your story.";
      break;
    default:
      icon = <IoPersonAdd />;
      text = "interacted with you.";
  }

  // Helper to determine if it's a follow-related notification
  const isFollowType = ['follow_request', 'req_approved', 'req_rejected'].includes(notification.notification_type);

  return (
    <div className={`flex items-center p-4 rounded-xl glass border border-white/5 transition-all hover:bg-white/5 ${!notification.is_read ? 'bg-white/5 border-l-4 border-l-text-accent' : ''}`}>
      {/* User Avatar */}
      <div onClick={() => navigate(`/profile/${notification.sender_username}`)} className="cursor-pointer mr-4">
        <Avatar src={notification.sender_profile_picture} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <p className="text-sm text-text-primary">
          <span
            onClick={() => navigate(`/profile/${notification.sender_username}`)}
            className="font-bold cursor-pointer hover:underline mr-1"
          >
            {notification.sender_username}
          </span>
          {text}
        </p>
        <span className="text-xs text-text-secondary mt-1 block">
          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Actions or Preview */}
      <div className="ml-4 flex items-center">
        {isFollowType ? (
          notification.notification_type === 'req_approved' ? (
            <span className="text-green-500 font-bold text-sm">Approved</span>
          ) : notification.notification_type === 'req_rejected' ? (
            <span className="text-red-500 font-bold text-sm">Rejected</span>
          ) : notification.notification_type === 'follow_request' ? (
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onAction(notification.id, 'accept_follow')}
                className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:shadow-green-500/50 transition-shadow"
                title="Accept Request"
              >
                <IoCheckmark size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onAction(notification.id, 'reject_follow')}
                className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:shadow-red-500/50 transition-shadow"
                title="Reject Request"
              >
                <IoClose size={20} />
              </motion.button>
            </div>
          ) : (
            <span className="text-sm text-text-secondary font-medium">
              Request Handled
            </span>
          )
        ) : (
          <>
            {link && (
              <div
                onClick={() => navigate(link)}
                className="w-10 h-10 rounded overflow-hidden cursor-pointer border border-white/10"
              >
                {notification.post_image ? (
                  <img src={notification.post_image} alt="Post" className="w-full h-full object-cover" />
                ) : notification.reel_thumbnail ? (
                  <video src={notification.reel_thumbnail} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl">{icon}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
