// frontend/src/components/features/feed/CreatePost.jsx

import React, { useState, useRef, useContext } from 'react';
import { createPost } from '../../../api/postApi';
import { AuthContext } from '../../../context/AuthContext';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Avatar from '../../common/Avatar';
import Spinner from '../../common/Spinner';

// --- Icons ---
import { IoImageOutline, IoVideocamOutline, IoSend, IoCloseOutline } from 'react-icons/io5';
import { FaLock } from 'react-icons/fa';

/**
 * Component for creating a new post.
 * @param {object} props
 * @param {() => void} props.onPostSuccess - Function to refresh the feed after successful post.
 */
const CreatePost = ({ onPostSuccess }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [isExclusive, setIsExclusive] = useState(false);
  const [requiredTier, setRequiredTier] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Create URL for media preview
  const mediaPreviewUrl = mediaFile ? URL.createObjectURL(mediaFile) : null;

  // --- Handlers ---

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setError(null);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    // Reset the file input field
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() && !mediaFile) {
      setError('Post must contain text or a media file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (mediaFile) {
        formData.append('media_file', mediaFile);
      }
      formData.append('is_exclusive', isExclusive);
      if (isExclusive) {
        formData.append('required_tier', requiredTier);
      }

      await createPost(formData);

      // Reset state and call success callback
      setContent('');
      setIsExclusive(false);
      setRequiredTier('basic');
      handleRemoveMedia(); // Clears file state and input value
      if (onPostSuccess) {
        onPostSuccess();
      }

    } catch (err) {
      setError('Failed to create post. Check file size or permissions.');
      console.error('Post creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Determine if the submit button should be disabled
  const isSubmitDisabled = loading || (!content.trim() && !mediaFile);

  return (
    <div className="rounded-xl border border-border bg-background-secondary p-4 shadow-lg">
      <form onSubmit={handleSubmit}>

        {/* --- Header & Avatar --- */}
        <div className="mb-4 flex items-start space-x-3">
          <Avatar src={user?.profile?.profile_picture} size="md" />

          {/* --- Textarea for Content --- */}
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            placeholder={`What's on your mind, ${user?.username}?`}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-border bg-background-primary p-3 
                       text-text-primary placeholder-text-secondary focus:ring-1 focus:ring-text-accent focus:outline-none transition-colors"
            disabled={loading}
          />
        </div>

        {/* --- Media Preview & Upload --- */}
        {mediaPreviewUrl && (
          <div className="relative mb-4 rounded-lg overflow-hidden border border-border">
            {mediaFile.type.startsWith('video') ? (
              <video src={mediaPreviewUrl} controls className="w-full max-h-80 object-cover" />
            ) : (
              <img src={mediaPreviewUrl} alt="Media Preview" className="w-full max-h-80 object-cover" />
            )}
            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
            >
              <IoCloseOutline className="h-5 w-5" />
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
          disabled={loading}
        />

        {/* --- Footer Actions & Submit --- */}
        <div className="flex items-center justify-between">

          {/* Media Buttons */}
          <div className="flex space-x-4 items-center flex-wrap gap-y-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
              leftIcon={<IoImageOutline className="h-5 w-5 text-text-accent" />}
              className="border-none hover:bg-background-accent/50 text-text-accent"
            >
              Add Photo/Video
            </Button>

            {/* Exclusive Content Toggle */}
            <div className="flex items-center space-x-2 bg-gray-900/50 rounded-lg px-3 py-1.5 border border-purple-500/20">
              <button
                type="button"
                onClick={() => setIsExclusive(!isExclusive)}
                className={`flex items-center space-x-1 text-sm font-semibold transition-colors ${
                  isExclusive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <FaLock className="mb-0.5" /> <span>Exclusive</span>
              </button>

              {isExclusive && (
                <select
                  value={requiredTier}
                  onChange={(e) => setRequiredTier(e.target.value)}
                  className="bg-transparent text-sm text-purple-300 border-none outline-none focus:ring-0 ml-2 py-0 cursor-pointer"
                >
                  <option value="basic" className="bg-gray-900">Basic Tier</option>
                  <option value="pro" className="bg-gray-900">Pro Tier</option>
                  <option value="elite" className="bg-gray-900">Elite Tier</option>
                </select>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            // Applying the unique gradient style
            className="bg-gradient-to-r from-text-accent/80 to-text-accent text-white hover:shadow-lg hover:shadow-text-accent/30 transition-all"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <IoSend className="mr-2" /> Publish
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </form>
    </div>
  );
};

export default CreatePost;