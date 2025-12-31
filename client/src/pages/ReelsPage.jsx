import React, { useState, useEffect, useRef } from 'react';
import { fetchReels } from '../api/reelApi';
import ReelCard from '../components/features/feed/ReelCard';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const { initialReelId } = location.state || {};

  useEffect(() => {
    loadReels();
  }, []);

  // Fisher-Yates shuffle for randomness
  const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const loadReels = async () => {
    try {
      const data = await fetchReels();
      setReels(shuffleArray([...data])); // Randomize reels on load
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to specific reel
  useEffect(() => {
    if (!loading && initialReelId && reels.length > 0) {
      const index = reels.findIndex(r => r.id === initialReelId);
      if (index !== -1 && containerRef.current) {
        setTimeout(() => {
          const child = containerRef.current.children[index];
          if (child) child.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }
    }
  }, [loading, reels, initialReelId]);

  const handleReelDeleted = (deletedId) => {
    setReels(prev => prev.filter(r => r.id !== deletedId));
  };

  return (
    <div className="h-full w-full bg-black flex justify-center">

      {/* Centered Column for Reels (Mobile Wrapper style) */}
      <div className="relative w-full md:w-[420px] h-full bg-black shadow-2xl overflow-hidden flex flex-col">

        {/* Feed Container */}
        <div
          ref={containerRef}
          className="flex-1 w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            reels.map(reel => (
              // On mobile, subtract nav heights (16 top + 16 bottom = 8rem or ~128px)
              // We use min-h to ensure snap works
              <div key={reel.id} className="w-full h-full snap-start shrink-0 relative flex justify-center bg-black">
                {/* 
                     Pass basic props. 
                     Note: ReelCard is now w-full h-full, so it fills this 420px container on desktop 
                     and 100% on mobile. 
                 */}
                <ReelCard
                  reel={reel}
                  onReelDeleted={handleReelDeleted}
                />
              </div>
            ))
          )}

          {!loading && reels.length === 0 && (
            <div className="h-full flex items-center justify-center text-white flex-col p-8 text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <FaCamera className="text-4xl text-text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Reels Yet</h3>
              <p className="mb-6 text-text-secondary">Captured moments will appear here.</p>
              <button onClick={() => navigate('/create/post', { state: { initialTab: 'reel' } })} className="bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition">Create First Reel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReelsPage;
