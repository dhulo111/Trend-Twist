import React, { useState, useContext } from 'react';
import { createTwist } from '../../../api/postApi';
import { AuthContext } from '../../../context/AuthContext';
import Button from '../../common/Button';
import Avatar from '../../common/Avatar';
import Spinner from '../../common/Spinner';
import { IoCloseOutline, IoImageOutline } from 'react-icons/io5';
import { FaLock } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const CreateTwistModal = ({ isOpen, onClose, originalPost, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const isCreator = user?.is_creator || user?.profile?.is_creator || false;
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [isExclusive, setIsExclusive] = useState(false);
  const [requiredTier, setRequiredTier] = useState('basic');
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
      formData.append('is_exclusive', isExclusive);
      if (isExclusive) {
        formData.append('required_tier', requiredTier);
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
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        onClick={(e) => e.stopPropagation()}
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
        <div className="px-6 py-4 border-t border-border flex flex-col gap-4 bg-background-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 -ml-2 text-text-accent hover:bg-text-accent/10 rounded-full transition-colors"
                title="Add Media"
              >
                <IoImageOutline size={24} />
              </button>
              
              <div className="h-6 w-[1px] bg-border mx-2" />
              
              {/* Exclusive Toggle — only for creators */}
              {isCreator && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsExclusive(!isExclusive)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      isExclusive 
                        ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' 
                        : 'border-border text-text-secondary hover:border-text-primary'
                    }`}
                  >
                    <FaLock size={12} className={isExclusive ? 'text-purple-400' : 'text-text-secondary'} />
                    <span>Premium Twist</span>
                  </button>

                  {isExclusive && (
                    <select
                      value={requiredTier}
                      onChange={(e) => setRequiredTier(e.target.value)}
                      className="bg-transparent text-xs text-purple-300 font-bold border-none outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="basic" className="bg-background-secondary">Basic+</option>
                      <option value="pro" className="bg-background-secondary">Pro+</option>
                      <option value="elite" className="bg-background-secondary">Elite</option>
                    </select>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              {content.length > 0 && (
                <span className={`text-xs ${content.length > 280 ? 'text-red-500 font-bold' : 'text-text-secondary font-medium'}`}>
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
        </div>
      </motion.div>
    </div>
  );
};

export default CreateTwistModal;
