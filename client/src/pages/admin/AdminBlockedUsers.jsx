import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Ban, Search, ChevronLeft, ChevronRight, Unlock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminBlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const PAGE_SIZE = 10;

  const fetchBlockedUsers = async (pageNum = 1, search = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API_URL}/admin/blocks/?page=${pageNum}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBlockedUsers(res.data.results);
      setTotalUsers(res.data.count);
      setHasMore(res.data.next !== null);
      setHasPrev(res.data.previous !== null);
    } catch (error) {
      console.error("Error fetching admin blocked users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchBlockedUsers(1, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      fetchBlockedUsers(newPage, searchTerm);
    }
  };

  const handlePrevPage = () => {
    if (hasPrev) {
      const newPage = page - 1;
      setPage(newPage);
      fetchBlockedUsers(newPage, searchTerm);
    }
  };

  const handleUnblockUser = async (userId) => {
    if (!window.confirm("Are you sure you want to unblock this user?")) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_URL}/admin/users/${userId}/unblock/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBlockedUsers(page, searchTerm);
    } catch (error) {
      console.error("Error unblocking user:", error);
      alert("Failed to unblock user.");
    }
  };

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Blocked Users</h2>
          <p className="text-sm text-gray-500 mt-1">Manage suspended accounts and view durations.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search ID, username, or email..."
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
                <th className="p-4 font-medium w-16">ID</th>
                <th className="p-4 font-medium w-1/4">User</th>
                <th className="p-4 font-medium w-1/4">Block Duration</th>
                <th className="p-4 font-medium w-1/3">Reason</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-purple-600 rounded-full" />
                      <p className="mt-4 font-medium">Loading blocked users...</p>
                    </div>
                  </td>
                </tr>
              ) : blockedUsers.length > 0 ? (
                blockedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-4 text-gray-500 text-sm font-mono">#{user.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">@{user.username}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        {user.blocked_until || 'Permanent'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {user.block_reason || 'No reason provided'}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleUnblockUser(user.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-md transition font-medium text-xs shadow-sm"
                          title="Unblock User"
                        >
                          <Unlock size={14} /> Unblock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-gray-500">
                    <Ban size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>No blocked users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30 dark:bg-gray-900/30">
          <span>Showing page <span className="font-semibold text-gray-900 dark:text-gray-100">{page}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span> ({totalUsers} total users)</span>
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

export default AdminBlockedUsers;
