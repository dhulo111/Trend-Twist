import React, { useContext, useEffect } from 'react';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Spinner from '../components/common/Spinner';
import Avatar from '../components/common/Avatar';
import { IoHeart, IoPersonAdd, IoChatbubble, IoCheckmark, IoClose } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const { user } = useContext(AuthContext);
  const { notifications, fetchNotifications, markAsRead, removeNotification } = useContext(SocketContext);
  const navigate = useNavigate();

  // Initial fetch is handled by SocketProvider, but we can ensure it's fresh
  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/notifications/${id}/${action}/`);

      // Don't remove, let it update via socket or manually mark 'is_read' if we want immediate feedback
      // Actually, since backend sends socket update, we might rely on that.
      // But for snappiness, we can optimistically update local state.
      // Note: The backend update will come down and overwrite/confirm this.

      // However, to show state change (Accepted/Rejected), the item needs to persist.
      // If we rely on socket update, it will arrive shortly.

    } catch (e) {
      console.error(`Failed to ${action}`, e);
      // Handle already gone
      if (e.response && e.response.status === 404) {
        removeNotification(id);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-4 px-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-text-primary">Notifications</h1>

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
      link = `/reels`; // Ideally deeper link if reel detail page exists
      break;
    case 'follow_request':
      icon = <IoPersonAdd className="text-blue-500" />;
      text = "wants to follow you.";
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
    default:
      icon = <IoPersonAdd />;
      text = "interacted with you.";
  }

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
        {notification.notification_type === 'follow_request' ? (
          // Check if it's already handled (is_read is a proxy for handled in this flow, or we check if follow_request_ref is missing)
          // Actually, the serializer sends 'follow_request_ref' which is an object or ID.
          // If backend deleted the request, the serializer might return null for that field?
          // Let's assume if it is read, it is handled.
          notification.is_read ? (
            <span className="text-sm text-text-secondary font-medium">
              {/* We don't know if accepted or rejected easily without more data, but 'Handled' is safe, or we check if we follow them? 
                           For now, "Request Handled" or just hide buttons.
                       */}
              Request Handled
            </span>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onAction(notification.id, 'accept_follow')}
                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full"
              >
                <IoCheckmark size={16} />
              </button>
              <button
                onClick={() => onAction(notification.id, 'reject_follow')}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
              >
                <IoClose size={16} />
              </button>
            </div>
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
