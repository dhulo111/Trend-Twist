import React, { useState, useRef } from 'react';
import { IoSearchOutline, IoCloseOutline, IoPlay, IoPause, IoCheckmark } from 'react-icons/io5';
import { searchMusic } from '../../api/musicApi';
import Spinner from '../common/Spinner';

const MusicPickerModal = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(new Audio());
  const [playingPreview, setPlayingPreview] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchMusic(query);
    setResults(data);
    setLoading(false);
  };

  const handlePlay = (track) => {
    if (playingPreview === track.id) {
      audioRef.current.pause();
      setPlayingPreview(null);
    } else {
      audioRef.current.src = track.previewUrl;
      audioRef.current.play().catch(e => console.log(e));
      setPlayingPreview(track.id);
    }
  };

  const handleClose = () => {
    audioRef.current.pause();
    setPlayingPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 w-full md:w-96 rounded-t-2xl md:rounded-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden border border-gray-800">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Select Music</h3>
          <button onClick={handleClose} className="text-white hover:bg-white/10 p-2 rounded-full">
            <IoCloseOutline size={24} />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <IoSearchOutline className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              className="w-full bg-gray-800 text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="Search songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center mt-10"><Spinner /></div>
          ) : (
            results.map(track => (
              <div key={track.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg group">
                <div className="relative w-12 h-12 flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full rounded bg-gray-700" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    {playingPreview === track.id ? <IoPause className="text-white" /> : <IoPlay className="text-white" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{track.title}</p>
                  <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                </div>
                <button
                  onClick={() => { handleClose(); onSelect(track); }}
                  className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-500"
                >
                  <IoCheckmark />
                </button>
              </div>
            ))
          )}
          {!loading && results.length === 0 && query && (
            <p className="text-center text-gray-400 mt-10">No results found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicPickerModal;
