import React, { useState, useEffect } from 'react';
import { createReel } from '../../../api/reelApi';
import { FaVideo, FaArrowLeft, FaMagic } from 'react-icons/fa';
import Button from '../../common/Button';
import ReelEditor from './ReelEditor';
import { useNavigate } from 'react-router-dom';

const CreateReel = ({ onSuccess, initialDraft = null }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Edit, 3: Details
  const [file, setFile] = useState(null);

  // Editor Output
  const [editorJson, setEditorJson] = useState(null);
  const [metadata, setMetadata] = useState(null); // { duration, music, trim, filter }
  const [draftState, setDraftState] = useState(null); // Restored state for editor

  // Final Details
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDraftLoad, setIsDraftLoad] = useState(false);

  // Initialize logic for drafts
  useEffect(() => {
    if (initialDraft) {
      setIsDraftLoad(true);
      const loadDraft = async () => {
        try {
          // Fetch Video Blob
          const response = await fetch(initialDraft.video_file);
          const blob = await response.blob();
          const videoFile = new File([blob], "draft_video.mp4", { type: "video/mp4" });
          setFile(videoFile);

          // Set State
          setCaption(initialDraft.caption || '');
          if (initialDraft.editor_json) {
            // The JSON from DB is likely an object already if using correct serializer, or string.
            // Assuming it's the object.
            const fullData = typeof initialDraft.editor_json === 'string' ? JSON.parse(initialDraft.editor_json) : initialDraft.editor_json;

            // Extract metadata from the stored JSON
            const { filter, trim, music, ...canvasData } = fullData;

            setEditorJson(canvasData);
            setDraftState({ filter, trim, music });
          }

          // Go to Editor Step
          setStep(2);
        } catch (e) {
          console.error("Failed to load draft video", e);
        } finally {
          setIsDraftLoad(false);
        }
      };
      loadDraft();
    }
  }, [initialDraft]);

  // Step 1: Handle File Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStep(2);
    }
  };

  // Step 2: Handle Editor Completion
  const handleEditorNext = (originalFile, json, meta) => {
    setEditorJson(json);
    setMetadata(meta);
    setStep(3);
  };

  // Step 3: Upload
  const handleShare = async (isDraft = false) => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('video_file', file);
    formData.append('caption', caption);

    // Add draft status
    if (isDraft) formData.append('is_draft', 'true');

    if (metadata) {
      formData.append('duration', Math.round(metadata.duration || 15));
      if (metadata.music) {
        formData.append('music_name', `${metadata.music.title} - ${metadata.music.artist} `);
      }
      if (editorJson) {
        // Bundle all metadata into JSON for robust draft restoration
        const finalJson = {
          ...editorJson,
          filter: metadata.filter,
          trim: metadata.trim,
          music: metadata.music
        };
        formData.append('editor_json', JSON.stringify(finalJson));
      }
    }

    try {
      await createReel(formData);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background-primary min-h-screen relative">

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl hover:border-text-accent transition group cursor-pointer relative bg-background-secondary m-4">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="w-20 h-20 bg-background-accent/20 rounded-full flex items-center justify-center mb-6">
            <FaVideo className="text-4xl text-text-accent" />
          </div>
          <p className="font-bold text-xl mb-2 text-text-primary">Select Video</p>
          <p className="text-sm text-text-secondary">Drag and drop or click to upload</p>
        </div>
      )}

      {/* Step 2: Editor */}
      {step === 2 && file && (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <ReelEditor
            mediaFile={file}
            initialJson={editorJson}
            initialMetadata={draftState}
            onNext={handleEditorNext}
            onCancel={() => setStep(1)}
          />
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="flex-1 p-4 animate-fade-in-up max-w-lg mx-auto w-full">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep(2)} className="p-2 hover:bg-background-secondary rounded-full">
              <FaArrowLeft />
            </button>
            <h2 className="text-xl font-bold">New Reel</h2>
          </div>

          <div className="flex gap-4 mb-6">
            {/* Thumbnail Preview (Static for now) */}
            <div className="w-24 h-40 bg-gray-800 rounded-lg overflow-hidden relative">
              <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted />
            </div>
            <div className="flex-1">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full h-32 bg-background-secondary rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-text-accent"
              ></textarea>
            </div>
          </div>

          <div className="mb-6">
            {metadata?.music && (
              <div className="glass-panel p-3 rounded-lg flex items-center gap-3">
                <span className="text-xl">🎵</span>
                <div>
                  <p className="font-bold text-sm">{metadata.music.title}</p>
                  <p className="text-xs text-text-secondary">{metadata.music.artist}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => handleShare(true)}
              fullWidth
              variant="outline"
              disabled={uploading}
              className="py-3 text-lg"
            >
              Save Draft
            </Button>

            <Button
              onClick={() => handleShare(false)}
              fullWidth
              variant="primary"
              disabled={uploading}
              className="py-3 text-lg"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaMagic className="animate-spin" /> Sharing...
                </div>
              ) : 'Share Reel'}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CreateReel;
