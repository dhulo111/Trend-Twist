import React, { useState, useContext } from 'react';
import { createTwist } from '../../../api/postApi';
import { AuthContext } from '../../../context/AuthContext';
import Button from '../../common/Button';
import Avatar from '../../common/Avatar';
import Spinner from '../../common/Spinner';
import { IoCloseOutline, IoImageOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

const CreateTwistModal = ({ isOpen, onClose, originalPost, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // File input ref
  const fileInputRef = React.useRef(null);
  const mediaPreviewUrl = mediaFile ? URL.createObjectURL(mediaFile) : null;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (mediaFile) {
        formData.append('media_file', mediaFile);
      }
      if (originalPost) {
        formData.append('original_post', originalPost.id);
      }

      await createTwist(formData);

      setContent('');
      setMediaFile(null);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to twist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl bg-background-secondary border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <IoCloseOutline size={28} />
          </button>
          <span className="font-bold text-text-accent text-lg">New Twist</span>
          <div className="w-7"></div> {/* Spacer for centering */}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Avatar src={user?.profile?.profile_picture} size="md" />
            </div>

            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening?"
                className="w-full bg-transparent text-text-primary text-xl placeholder-text-secondary/50 focus:outline-none resize-none min-h-[120px]"
                autoFocus
              />

              {/* Media Preview (Current Twist) */}
              {mediaPreviewUrl && (
                <div className="relative mb-4 rounded-xl overflow-hidden border border-border group">
                  {mediaFile.type.startsWith('video') ? (
                    <video src={mediaPreviewUrl} className="w-full max-h-64 object-cover" controls />
                  ) : (
                    <img src={mediaPreviewUrl} className="w-full max-h-64 object-cover" alt="Preview" />
                  )}
                  <button
                    type="button"
                    onClick={() => { setMediaFile(null); fileInputRef.current.value = '' }}
                    className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <IoCloseOutline size={20} />
                  </button>
                </div>
              )}

              {/* Quoted Post Preview */}
              {originalPost && (
                <div className="mt-2 rounded-xl border border-border bg-background-primary overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <Avatar src={originalPost.author_profile_picture} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-text-primary text-[15px] truncate">{originalPost.author_username}</span>
                        <span className="text-text-secondary text-xs">· {new Date(originalPost.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-text-primary text-[15px] mb-2 break-words">{originalPost.content}</p>
                    </div>
                  </div>

                  {originalPost.media_file && (
                    <div className="h-48 w-full bg-black/10 relative">
                      {/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(originalPost.media_file) ? (
                        <video src={originalPost.media_file} className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <img src={originalPost.media_file} className="w-full h-full object-cover" alt="Quoted media" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-background-secondary">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 -ml-2 text-text-accent hover:bg-text-accent/10 rounded-full transition-colors"
              title="Add Media"
            >
              <IoImageOutline size={24} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-4">
            {content.length > 0 && (
              <span className={`text-sm ${content.length > 280 ? 'text-red-500' : 'text-text-secondary'}`}>
                {280 - content.length}
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !mediaFile)}
              className="px-6 rounded-full bg-gradient-to-r from-text-accent/90 to-text-accent hover:shadow-lg hover:shadow-text-accent/20 transition-all text-white font-bold"
            >
              {loading ? <Spinner size="sm" color="text-white" /> : 'Twist'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateTwistModal;
