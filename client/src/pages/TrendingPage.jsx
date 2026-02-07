import React, { useState, useEffect } from 'react';
import CreateTwistInput from '../components/features/trends/components/CreateTwistInput';
import TwistCard from '../components/features/feed/TwistCard';
import Spinner from '../components/common/Spinner';
import { getPublicTwists } from '../api/postApi';
import { IoPlanetOutline } from 'react-icons/io5';

const TrendingPage = () => {
  const [twists, setTwists] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllTwists = async () => {
    setLoading(true);
    try {
      // Fetch all public twists (not filtered by tag)
      const response = await getPublicTwists('');
      setTwists(response);
    } catch (e) {
      console.error("Error loading twists", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTwists();
  }, []);

  const handleRefresh = async () => {
    // Background refresh without full loading spinner
    try {
      const response = await getPublicTwists('');
      setTwists(response);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="w-full min-h-screen pb-20 pt-6">

      <div className="max-w-2xl mx-auto px-4">

        {/* --- Header --- */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-accent/20 rounded-full text-accent">
            <IoPlanetOutline size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Global Feed</h1>
            <p className="text-text-secondary text-sm">See what the world is twisting about right now.</p>
          </div>
        </div>

        {/* --- Create Input --- */}
        <CreateTwistInput onPostCreated={handleRefresh} />

        {/* --- Feed --- */}
        <div className='flex flex-col gap-4'>
          {loading ? (
            <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
          ) : twists.length > 0 ? (
            twists.map(twist => (
              <div key={twist.id} className="bg-background-secondary border border-border rounded-2xl overflow-hidden hover:border-text-secondary/30 transition-colors shadow-sm">
                <TwistCard post={twist} onUpdate={handleRefresh} />
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-background-secondary rounded-2xl border border-border">
              <p className="text-text-secondary text-lg">No twists yet.</p>
              <p className="text-text-secondary text-sm mt-1">Be the first to start the conversation!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TrendingPage;