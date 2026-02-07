import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import Avatar from '../../../common/Avatar';
import { createTwist } from '../../../../api/postApi';
import { IoImageOutline, IoSend, IoClose } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

const CreateTwistInput = ({ selectedHashTag, onPostCreated }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState(selectedHashTag ? `#${selectedHashTag} ` : '');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Update content if selectedHashTag changes
  React.useEffect(() => {
    if (selectedHashTag) {
      if (!content.includes(`#${selectedHashTag}`)) {
        setContent(prev => `#${selectedHashTag} ${prev}`);
      }
    }
  }, [selectedHashTag]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (mediaFile) {
        formData.append('media_file', mediaFile);
      }

      await createTwist(formData);
      setContent('');
      clearMedia();
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error("Failed to post twist:", error);
      alert("Failed to post twist. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-4 mb-6 border border-border bg-background-secondary shadow-sm">
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <Avatar src={user?.profile?.profile_picture} alt={user?.username} size="md" />
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 outline-none text-text-primary text-lg resize-none placeholder-text-secondary min-h-[60px]"
              placeholder={selectedHashTag ? `Twist about #${selectedHashTag}...` : "What's happening?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <AnimatePresence>
              {mediaPreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative mt-2 mb-4 rounded-xl overflow-hidden group max-w-sm"
                >
                  <img src={mediaPreview} alt="Preview" className="max-h-60 w-auto object-cover rounded-xl border border-white/10" />
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <IoClose size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-accent hover:text-accent/80 transition-colors p-2 rounded-full hover:bg-accent/10"
                  title="Add Image/Video"
                >
                  <IoImageOutline size={22} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={(!content.trim() && !mediaFile) || isSubmitting}
                className="bg-accent hover:bg-accent/90 text-dark px-6 py-2 rounded-full font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                {isSubmitting ? 'Twisting...' : 'Twist'}
                <IoSend size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTwistInput;
