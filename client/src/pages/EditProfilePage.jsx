// frontend/src/pages/EditProfilePage.jsx (NEW FILE)

import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import EditProfileForm from '../components/features/profile/EditProfileForm';
import Button from '../components/common/Button';
import { IoArrowBackOutline } from 'react-icons/io5';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useContext(AuthContext);

  // Navigate back to the profile page after successful edit
  const handleSuccess = async (updatedProfile) => {
    // Refresh the global user state
    await refreshUserProfile();
    // Navigate to the (potentially new) username
    navigate(`/profile/${updatedProfile?.username || user?.username}`, { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-bg-primary p-4 md:p-8 flex flex-col">
      {/* Header Section */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          onClick={() => navigate(-1)}
          variant="secondary"
          size="sm"
          leftIcon={<IoArrowBackOutline className='h-5 w-5' />}
          className="rounded-full px-4 py-2 hover:bg-bg-accent transition-colors"
        >
          Back to Profile
        </Button>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Left Side: Title & Info (Optional, or just keep it simple) */}
            <div className="lg:col-span-4 flex flex-col justify-start pt-4">
              <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-accent mb-4">
                Edit Profile
              </h1>
              <p className="text-text-secondary text-lg">
                Update your personal details, privacy settings, and public appearance.
              </p>
            </div>

            {/* Right Side: The Form */}
            <div className="lg:col-span-8">
              <div className="rounded-3xl glass-panel shadow-2xl p-6 md:p-10 border border-white/20 bg-bg-secondary/50">
                <EditProfileForm onSuccess={handleSuccess} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;