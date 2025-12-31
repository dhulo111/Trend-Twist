// frontend/src/components/features/chat/Message.jsx

import React, { useContext, useState, useRef, useEffect } from 'react';
import { IoEllipsisVertical, IoPencil, IoTrash, IoCheckmark, IoClose } from 'react-icons/io5';

const Message = ({ message, currentUsername, onEdit, onDelete }) => {
  const isMine = currentUsername === message.author_username;
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setShowActions(false);
  };

  // Style based on who sent the message
  const bubbleClasses = isMine
    ? 'bg-text-accent text-white rounded-tr-none ml-4'
    : 'bg-background-accent text-text-primary rounded-tl-none mr-4';

  return (
    <div
      className={`flex w-full group relative items-center ${isMine ? 'justify-end flex-row' : 'justify-start flex-row-reverse'}`}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Action Menu Trigger (Only for own messages) */}
      {isMine && !isEditing && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowActions(!showActions)}
            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-secondary ${showActions ? 'opacity-100' : ''}`}
          >
            <IoEllipsisVertical size={16} />
          </button>

          {showActions && (
            <div className="absolute bottom-full right-0 mb-2 w-24 bg-glass-bg backdrop-blur-md rounded-lg shadow-xl border border-border z-20 flex flex-col p-1">
              <button
                onClick={() => { setIsEditing(true); setShowActions(false); }}
                className="flex items-center px-2 py-2 text-xs text-text-primary hover:bg-white/10 rounded"
              >
                <IoPencil className="mr-2" /> Edit
              </button>
              <button
                onClick={handleUnsend}
                className="flex items-center px-2 py-2 text-xs text-red-500 hover:bg-white/10 rounded"
              >
                <IoTrash className="mr-2" /> Unsend
              </button>
            </div>
          )}
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
                onClick={() => { window.location.href = `/reels` }}
                className="mb-2 rounded-lg overflow-hidden cursor-pointer border border-white/20 bg-black min-w-[150px]"
              >
                <div className="relative w-full aspect-[9/16] max-h-[250px] flex items-center justify-center bg-gray-900">
                  <video
                    src={message.shared_reel_data.thumbnail}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="p-2 bg-black/50 rounded-full text-white">▶</div>
                  </div>
                </div>
                <div className="p-2 text-xs bg-black/50 backdrop-blur-md">
                  <p className="font-bold truncate text-white">@{message.shared_reel_data.author_username}</p>
                  <p className="truncate opacity-70 text-white/80">{message.shared_reel_data.caption}</p>
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