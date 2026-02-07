
import React, { useState, useEffect } from 'react';
import { getPublicTwists } from '../../../api/postApi';
import TwistCard from '../feed/TwistCard';
import Spinner from '../../common/Spinner';
import { Link } from 'react-router-dom';
import { IoArrowForward, IoPlanetOutline } from 'react-icons/io5';

const HomeTwistSidebar = () => {
  const [twists, setTwists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTwists = async () => {
      try {
        const data = await getPublicTwists('');
        // Take only top 5 for the sidebar
        setTwists(data.slice(0, 5));
      } catch (error) {
        console.error("Failed to fetch sidebar twists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTwists();
  }, []);

  return (
    <div className="space-y-4">

      {/* Header Card */}
      <div className="bg-background-secondary border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <IoPlanetOutline className="text-accent" size={20} />
          <h2 className="text-lg font-bold text-text-primary">Top Twists</h2>
        </div>
        <Link to="/trending" className="p-2 hover:bg-background-accent/10 rounded-full text-text-secondary hover:text-text-primary transition-colors">
          <IoArrowForward size={18} />
        </Link>
      </div>

      {/* Feed List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-10 flex justify-center"><Spinner size="sm" /></div>
        ) : twists.length > 0 ? (
          twists.map(twist => (
            <div key={twist.id} className="bg-background-secondary border border-border rounded-xl overflow-hidden hover:border-text-secondary/30 transition-colors shadow-sm">
              {/* Render minimal TwistCard or full one. Standard one is responsive enough. */}
              <div className="scale-[0.95] origin-top-left w-[105%] -mb-2">
                <TwistCard post={twist} />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-text-secondary">
            No active twists.
          </div>
        )}
      </div>

      <Link to="/trending" className="block text-center text-sm text-text-accent hover:underline py-2">
        View more on Global Feed
      </Link>

    </div>
  );
};

export default HomeTwistSidebar;
