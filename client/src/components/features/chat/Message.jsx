// frontend/src/components/features/chat/Message.jsx

import React, { useContext, useState, useRef, useEffect } from 'react';
import { IoPencil, IoTrash, IoCheckmark, IoClose } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const Message = ({ message, currentUsername, onEdit, onDelete }) => {
  const isMine = currentUsername === message.author_username;
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleUnsend = () => {
    if (window.confirm("Unsend this message?")) {
      onDelete(message.id);
    }
  };

  // Style based on who sent the message
  const bubbleClasses = isMine
    ? 'bg-text-accent text-white rounded-tr-none ml-4'
    : 'bg-background-accent text-text-primary rounded-tl-none mr-4';

  return (
    <div
      className={`flex w-full group relative items-center ${isMine ? 'justify-end flex-row' : 'justify-start flex-row-reverse'}`}
    >
      {/* Action Menu Trigger (Only for own messages) */}
      {/* Action Buttons (Only for own messages) */}
      {isMine && !isEditing && (
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => setIsEditing(true)}
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-full hover:bg-white/5 transition-colors"
            title="Edit"
          >
            <IoPencil size={15} />
          </button>
          <button
            onClick={handleUnsend}
            className="text-text-secondary hover:text-red-500 p-1.5 rounded-full hover:bg-white/5 transition-colors"
            title="Unsend"
          >
            <IoTrash size={15} />
          </button>
        </div>
      )}

      <div
        className={`max-w-xs md:max-w-sm px-4 py-2 my-1 rounded-xl shadow-md text-sm break-words relative ${bubbleClasses}`}
      >
        {isEditing ? (
          <div className="flex flex-col min-w-[150px]">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-transparent border-b border-white/50 focus:outline-none text-white w-full mb-2 pb-1"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-white">
              <button onClick={handleSaveEdit} className="hover:text-green-300"><IoCheckmark size={18} /></button>
              <button onClick={handleCancelEdit} className="hover:text-red-300"><IoClose size={18} /></button>
            </div>
          </div>
        ) : (
          <>
            {message.shared_reel_data ? (
              <div
                onClick={() => navigate(`/reels/${message.shared_reel_data.id}`)}
                className="mb-2 rounded-lg overflow-hidden cursor-pointer border border-white/20 bg-black min-w-[150px] transition-transform hover:scale-[1.02]"
              >
                <div className="relative w-full aspect-[9/16] max-h-[250px] flex items-center justify-center bg-gray-900">
                  <video
                    src={message.shared_reel_data.thumbnail}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="p-2 bg-black/50 rounded-full text-white pointer-events-none">▶</div>
                  </div>
                </div>
                <div className="p-2 text-xs bg-black/50 backdrop-blur-md">
                  <p className="font-bold truncate text-white">@{message.shared_reel_data.author_username}</p>
                  <p className="truncate opacity-70 text-white/80">{message.shared_reel_data.caption}</p>
                </div>
              </div>
            ) : null}

            {message.shared_post_data ? (
              <div
                onClick={() => navigate(`/post/${message.shared_post_data.id}`)}
                className="mb-2 rounded-lg overflow-hidden cursor-pointer border border-border bg-background-secondary min-w-[150px] transition-transform hover:scale-[1.02] shadow-sm"
              >
                {message.shared_post_data.thumbnail && (
                  <div className="relative w-full aspect-square max-h-[200px] flex items-center justify-center bg-background-primary overflow-hidden">
                    <img
                      src={message.shared_post_data.thumbnail}
                      alt="Shared post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-2 text-xs border-t border-border">
                  <p className="font-bold truncate text-text-primary">@{message.shared_post_data.author_username}</p>
                  <p className="truncate text-text-secondary">{message.shared_post_data.content}</p>
                </div>
              </div>
            ) : null}

            {message.shared_twist_data ? (
              <div
                onClick={() => navigate(`/twists/${message.shared_twist_data.id}`)}
                className="mb-2 rounded-lg overflow-hidden cursor-pointer border border-border bg-background-secondary min-w-[150px] transition-transform hover:scale-[1.02] shadow-sm"
              >
                {message.shared_twist_data.thumbnail && (
                  <div className="relative w-full aspect-square max-h-[200px] flex items-center justify-center bg-background-primary overflow-hidden">
                    <img
                      src={message.shared_twist_data.thumbnail}
                      alt="Shared twist"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-2 text-xs border-t border-border">
                  <p className="font-bold truncate text-text-primary">@{message.shared_twist_data.author_username}</p>
                  <p className="truncate text-text-secondary">{message.shared_twist_data.content}</p>
                </div>
              </div>
            ) : null}

            {message.story_reply_data ? (
              <div
                className="mb-2 rounded-lg overflow-hidden border border-white/20 bg-black/40 min-w-[120px] max-w-[180px] shadow-sm flex flex-col"
              >
                <div className="relative w-full aspect-[4/5] overflow-hidden bg-gray-900">
                  {message.story_reply_data.media_type === 'video' ? (
                    <video
                      src={message.story_reply_data.media_file}
                      className="w-full h-full object-cover opacity-60"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={message.story_reply_data.media_file}
                      alt="Story"
                      className="w-full h-full object-cover opacity-60"
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[10px] text-white/70 italic mb-0.5">Replied to story</p>
                    <p className="text-xs font-bold text-white truncate">@{message.story_reply_data.author_username}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <p className="whitespace-pre-wrap">{message.content}</p>
            <span className={`block text-right mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-text-secondary'}`}>
              {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default Message;