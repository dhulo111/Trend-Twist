import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MessageSquare, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminTwists = () => {
  const [twists, setTwists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalTwists, setTotalTwists] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const PAGE_SIZE = 10;

  const fetchTwists = async (pageNum = 1, search = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API_URL}/admin/twists/?page=${pageNum}&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTwists(res.data.results);
      setTotalTwists(res.data.count);
      setHasMore(res.data.next !== null);
      setHasPrev(res.data.previous !== null);
    } catch (error) {
      console.error("Error fetching admin twists:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTwists(1, searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      fetchTwists(newPage, searchTerm);
    }
  };

  const handlePrevPage = () => {
    if (hasPrev) {
      const newPage = page - 1;
      setPage(newPage);
      fetchTwists(newPage, searchTerm);
    }
  };

  const deleteTwist = async (twistId) => {
    if (!window.confirm("Are you sure you want to delete this twist?")) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_URL}/admin/twists/${twistId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh current page
      fetchTwists(page, searchTerm);
    } catch (err) {
      alert("Failed to delete twist.");
    }
  };

  const totalPages = Math.ceil(totalTwists / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Twist Moderation</h2>
          <p className="text-sm text-gray-500 mt-1">Review short text-based twists across the platform.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search twists or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-medium w-16">Media</th>
                <th className="p-4 font-medium">Author</th>
                <th className="p-4 font-medium w-1/2">Content</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-purple-600 rounded-full" />
                      <p className="mt-4 font-medium">Loading twists...</p>
                    </div>
                  </td>
                </tr>
              ) : twists.length > 0 ? (
                twists.map(twist => (
                  <tr key={twist.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      {twist.media_url ? (
                        <a href={twist.media_url.startsWith('http') ? twist.media_url : `http://localhost:8000${twist.media_url}`} target="_blank" rel="noopener noreferrer">
                          <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-700 relative hover:opacity-80 transition cursor-pointer">
                            <img src={twist.media_url.startsWith('http') ? twist.media_url : `http://localhost:8000${twist.media_url}`} alt="Twist Media" className="w-full h-full object-cover" />
                          </div>
                        </a>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-400">
                          <MessageSquare size={16} />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">@{twist.author}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">ID: {twist.id}</div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {twist.content || <span className="text-gray-400 italic">No text content</span>}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(twist.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => deleteTwist(twist.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-md text-xs font-medium transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>No twists found matching "{searchTerm}"</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30 dark:bg-gray-900/30">
          <span>Showing page <span className="font-semibold text-gray-900 dark:text-gray-100">{page}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span> ({totalTwists} total twists)</span>
          <div className="flex gap-2">
            <button
              disabled={!hasPrev || loading}
              onClick={handlePrevPage}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              disabled={!hasMore || loading}
              onClick={handleNextPage}
              className="flex items-center gap-1 px-3 py-1.5 border border-purple-200 dark:border-purple-800 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTwists;
