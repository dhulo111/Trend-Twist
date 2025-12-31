import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReel } from '../api/reelApi';
import { FaArrowLeft, FaVideo, FaMusic } from 'react-icons/fa';

const ReelCreatePage = () => {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [musicName, setMusicName] = useState('');
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video_file', file);
    formData.append('caption', caption);
    if (musicName) formData.append('music_name', musicName);

    try {
      await createReel(formData);
      navigate('/reels');
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <button onClick={() => navigate(-1)} className="mb-6 text-2xl"><FaArrowLeft /></button>
        <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-pink-500 to-purple-500 text-transparent bg-clip-text">New Reel</h1>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition h-64 bg-gray-900 relative">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="text-center">
                <FaVideo className="text-4xl text-green-500 mb-2 mx-auto" />
                <p className="font-semibold">{file.name}</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <FaVideo className="text-5xl mb-4 mx-auto" />
                <p>Tap to select video</p>
                <p className="text-xs mt-2">MP4, WebM (Max 60s)</p>
              </div>
            )}
          </div>

          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-pink-500"
              rows="3"
            ></textarea>
          </div>

          <div className="flex items-center space-x-2 bg-gray-900 border border-gray-700 rounded-lg p-3">
            <FaMusic className="text-gray-400" />
            <input
              type="text"
              value={musicName}
              onChange={(e) => setMusicName(e.target.value)}
              placeholder="Add music name (optional)"
              className="bg-transparent w-full focus:outline-none text-white"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${uploading || !file ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:scale-105 transition'}`}
          >
            {uploading ? 'Posting...' : 'Share Reel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReelCreatePage;
