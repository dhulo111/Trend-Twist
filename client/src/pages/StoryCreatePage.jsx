// frontend/src/pages/StoryCreatePage.jsx

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStory } from '../api/storyApi';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import FabricStoryEditor from '../components/features/feed/StoryEditorPanel';
import { IoArrowBackOutline, IoCameraOutline, IoCloseOutline } from 'react-icons/io5';

// Mock Data for Music System
const MOCK_MUSIC_TRACKS = [
  { id: 1, title: 'Trend Wave', artist: 'Synth Beats' },
  { id: 2, title: 'Urban Twist', artist: 'DJ Code' },
  { id: 3, title: 'Focus Flow', artist: 'Soft Vibes' },
];

const StoryCreatePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // --- Handlers ---
  const resetForm = () => {
    setStep(1);
    setMediaFile(null);
    setSelectedMusic(null);
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File is too large (max 50MB).');
        return;
      }
      setMediaFile(file);
      setStep(2); // Auto-advance to editing
    }
  };

  const handlePublish = async (editedFile, editorJson, storyDuration) => {
    // If we have an edited file from the editor (which we should), use it. 
    // Otherwise fallback to original (safe-guard).
    const fileToUpload = editedFile || mediaFile;

    if (!fileToUpload || loading) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('media_file', fileToUpload);

      let finalCaption = 'Shared a new moment!';
      if (selectedMusic) {
        finalCaption += ` [Music: ${selectedMusic.title}]`;
      }
      formData.append('caption', finalCaption);

      // --- Append New Features ---
      if (selectedMusic) {
        formData.append('music_title', selectedMusic.title);
        // If we have a preview URL, try to fetch it and append as file
        if (selectedMusic.previewUrl) {
          try {
            const musicRes = await fetch(selectedMusic.previewUrl);
            const musicBlob = await musicRes.blob();
            // Create a file from blob
            const musicFile = new File([musicBlob], `music_${Date.now()}.m4a`, { type: 'audio/mp4' });
            formData.append('music_file', musicFile);
          } catch (e) {
            console.warn("Could not download music preview for upload", e);
          }
        }
      }

      if (editorJson) {
        formData.append('editor_json', JSON.stringify(editorJson));
      }

      // Add duration if present
      if (storyDuration) {
        formData.append('duration', storyDuration);
      }

      await createStory(formData);

      resetForm();
      navigate('/', { replace: true });

    } catch (err) {
      console.error(err);
      setError('Failed to publish story.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      resetForm();
    } else {
      navigate(-1);
    }
  };

  // --- Render ---
  return (
    <div className="mx-auto max-w-4xl pb-12 pt-4">

      {/* --- Header --- */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-6 relative">
        <div className='flex items-center space-x-3'>
          <Button
            onClick={handleBack}
            variant="secondary"
            size="sm"
            leftIcon={<IoArrowBackOutline className='h-5 w-5' />}
            className="rounded-full px-3 py-1.5"
          >
            {step === 1 ? 'Home' : 'Discard'}
          </Button>
          <h1 className="text-3xl font-bold text-text-primary">
            {step === 1 ? 'New Story' : 'Edit Story'}
          </h1>
        </div>

        {/* Loading Indicator Overlay if publishing */}
        {loading && (
          <div className="absolute right-0 flex items-center gap-2 text-indigo-500 font-semibold animate-pulse">
            <Spinner size="sm" /> Publishing...
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500 p-3 bg-red-500/10 rounded-lg font-medium">
          <IoCloseOutline className='inline mr-2 h-4 w-4' /> {error}
        </p>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* --- Content Area --- */}
      <div className="flex justify-center w-full"> {/* Removed surrounding box for cleaner fullscreen feel */}

        {/* Step 1: Media Selection */}
        {step === 1 && (
          <div className="w-full max-w-md flex flex-col items-center p-12 space-y-5 rounded-3xl border-2 border-dashed border-border/70 bg-background-secondary/50 my-12 hover:bg-background-secondary transition-colors">
            <div className="h-24 w-24 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mb-4">
              <IoCameraOutline className="h-12 w-12" />
            </div>
            <h2 className='text-2xl font-bold text-text-primary'>Create a Story</h2>
            <p className='text-text-secondary text-center max-w-xs'>Share your moments with friends. Photos and videos are supported.</p>
            <Button
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
              className="px-8 py-3 rounded-full text-lg shadow-lg shadow-indigo-500/20"
            >
              Select from Computer
            </Button>
          </div>
        )}

        {/* Step 2: Editing */}
        {step === 2 && (
          <FabricStoryEditor
            mediaFile={mediaFile}
            selectedMusic={selectedMusic}
            setSelectedMusic={setSelectedMusic}
            onPublish={handlePublish}
          />
        )}
      </div>
    </div>
  );
};

export default StoryCreatePage;