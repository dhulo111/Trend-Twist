import React, { useState, useEffect, useRef } from 'react';
import { fetchReels } from '../api/reelApi';
import ReelCard from '../components/features/feed/ReelCard';
import { FaArrowLeft, FaCamera } from 'react-icons/fa';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

const ReelsPage = () => {
  useSEO('Reels', 'Discover and watch the most engaging short-form videos on Trend Twist.');
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track which reel is currently visible to drive progressive loading
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { reelId } = useParams();
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
      let shuffled = shuffleArray([...data]); // Randomize reels on load
      
      // If we have a specific reel ID requested via URL or state, move it to the front
      const targetId = reelId || initialReelId;
      if (targetId) {
        const index = shuffled.findIndex(r => r.id.toString() === targetId.toString());
        if (index !== -1) {
          const selectedReel = shuffled.splice(index, 1)[0];
          shuffled.unshift(selectedReel);
        }
      }

      setReels(shuffled);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // We don't need scrollIntoView anymore because the requested reel is placed at the top (index 0)

  const handleReelDeleted = (deletedId) => {
    setReels(prev => prev.filter(r => r.id !== deletedId));
  };

  const handleReelVisible = (id) => {
    // Update the URL to match the currently viewed reel (Instagram style)
    if (window.history.replaceState) {
      window.history.replaceState(null, '', `/reels/${id}`);
    }
    // Update the current index so progressive loading can kick in
    const idx = reels.findIndex(r => r.id === id);
    if (idx !== -1) setCurrentIndex(idx);
  };

  /**
   * Progressive loading strategy:
   *   - current reel  → preload="auto"   (full load)
   *   - next reel     → preload="auto"   (pre-buffer in background)
   *   - reel after    → preload="metadata" (just metadata, minimal cost)
   *   - all others    → preload="none"   (completely dormant)
   */
  const getPreloadLevel = (index) => {
    if (index === currentIndex) return 'active';      // currently playing
    if (index === currentIndex + 1) return 'next';    // preload fully
    if (index === currentIndex + 2) return 'upcoming'; // preload metadata only
    return 'none';
  };

  return (
    <div className="h-full w-full bg-black flex justify-center items-center">

      {/* Centered Column for Reels (Mobile Wrapper style - adjusted for sidebars on desktop) */}
      <div className="relative w-[94%] h-[94%] md:w-full md:max-w-[500px] md:h-full bg-black shadow-2xl md:shadow-none overflow-hidden md:overflow-visible flex flex-col rounded-xl md:rounded-none">

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
            reels.map((reel, index) => (
              <div key={reel.id} className="w-full h-full snap-start [scroll-snap-stop:always] shrink-0 relative flex justify-center bg-black">
                <ReelCard
                  reel={reel}
                  onReelDeleted={handleReelDeleted}
                  onVisible={handleReelVisible}
                  preloadLevel={getPreloadLevel(index)}
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
