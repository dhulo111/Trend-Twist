// frontend/src/components/features/profile/EditProfileForm.jsx

import React, { useState, useContext, useRef } from 'react';
import { updateUserProfile } from '../../../api/userApi';
import { AuthContext } from '../../../context/AuthContext';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Avatar from '../../common/Avatar';
import { IoCameraOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';

/**
 * The core form logic for updating a user's profile and privacy settings.
 * * @param {object} props
 * @param {function} props.onSuccess - Callback function to handle successful update.
 */
const EditProfileForm = ({ onSuccess }) => {
  const { user, loading: authLoading, logoutUser } = useContext(AuthContext);

  // Local state initialized with current user data
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.profile?.website_url || '');
  const [isPrivate, setIsPrivate] = useState(user?.profile?.is_private || false);

  const [profilePicture, setProfilePicture] = useState(null); // File object
  const [previewImage, setPreviewImage] = useState(user?.profile?.profile_picture || null); // URL for preview

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  // --- Image Handling ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreviewImage(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleOpenFileInput = () => {
    fileInputRef.current.click();
  };

  // --- Submission Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();

      // Append fields only if they are changed
      if (username !== (user?.username || '')) formData.append('username', username);
      if (email !== (user?.email || '')) formData.append('email', email);
      if (firstName !== (user?.first_name || '')) formData.append('first_name', firstName);
      if (lastName !== (user?.last_name || '')) formData.append('last_name', lastName);

      if (bio !== (user?.profile?.bio || '')) {
        formData.append('bio', bio);
      }
      if (websiteUrl !== (user?.profile?.website_url || '')) {
        formData.append('website_url', websiteUrl);
      }
      if (isPrivate !== (user?.profile?.is_private || false)) {
        formData.append('is_private', isPrivate);
      }
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }

      // If no data to update, skip API call
      if (!profilePicture && formData.entries().next().done) {
        setError("No changes detected.");
        setLoading(false);
        return;
      }

      const response = await updateUserProfile(formData);
      // Wait for a bit? No, just set success.
      setSuccess(true);
      if (onSuccess) onSuccess(response); // Notify parent page with updated data

    } catch (err) {
      setError('Failed to update profile. Check server and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* --- Profile Picture Section --- */}
        <div className="flex items-center space-x-6 pb-6 border-b border-white/10">
          <div className="relative group">
            <Avatar
              src={previewImage}
              alt="Profile Preview"
              size="2xl"
              className="cursor-pointer border-4 border-bg-secondary shadow-xl transition-transform group-hover:scale-105"
              onClick={handleOpenFileInput}
            />
            <div onClick={handleOpenFileInput} className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <IoCameraOutline className="text-white h-8 w-8" />
            </div>
          </div>

          <div className="flex flex-col items-start">
            <h3 className="text-lg font-bold text-text-primary">Profile Photo</h3>
            <p className="text-sm text-text-secondary mb-3">Recommended: Square JPG, PNG</p>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" disabled={loading} />
            <Button
              type="button"
              onClick={handleOpenFileInput}
              variant="secondary"
              size="sm"
              leftIcon={<IoCameraOutline className='h-4 w-4' />}
            >
              Upload New
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* --- 1. Basic Details --- */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="username"
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="firstName"
                label="First Name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
              <Input
                id="lastName"
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Bio</label>
              <textarea
                id="bio"
                rows="4"
                placeholder="Tell us about yourself (max 250 chars)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl bg-bg-primary/50 border border-border px-4 py-3 text-text-primary placeholder-text-secondary focus:border-text-accent focus:ring-2 focus:ring-text-accent/20 transition-all outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <Input
                id="websiteUrl"
                label="Website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* --- 2. Privacy Settings --- */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-text-primary mb-4">Privacy & Access</h3>
            <div className="flex items-center justify-between rounded-xl bg-bg-primary/40 p-5 border border-white/10 hover:border-text-accent/30 transition-colors cursor-pointer" onClick={() => setIsPrivate(!isPrivate)}>
              <div className="pr-4">
                <label htmlFor="isPrivateToggle" className="font-semibold text-text-primary block text-lg pointer-events-none">
                  Private Account
                </label>
                <p className='text-sm text-text-secondary pointer-events-none'>
                  Only approved followers will see your photos and videos. This won't affect existing followers.
                </p>
              </div>
              {/* Toggle Switch */}
              <button
                type="button"
                id="isPrivateToggle"
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${isPrivate ? 'bg-text-accent' : 'bg-gray-300 dark:bg-gray-700'}`}
                disabled={loading}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* --- Status & Submit --- */}
        <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            {success && (
              <p className="flex items-center space-x-2 text-sm text-green-500 font-bold animate-pulse">
                <IoCheckmarkCircleOutline className="h-5 w-5" /> Saved!
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full md:w-auto min-w-[150px] bg-gradient-to-r from-text-accent to-purple-600 hover:shadow-lg hover:shadow-text-accent/30 transition-all text-white font-bold"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default EditProfileForm;