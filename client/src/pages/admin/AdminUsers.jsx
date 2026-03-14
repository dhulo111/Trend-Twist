import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const PAGE_SIZE = 20;

  const fetchUsers = async (pageNum = 1, search = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API_URL}/admin/users/?page=${pageNum}&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Map the paginated data 
      const mapped = res.data.results.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        profileImage: u.profile?.profile_picture,
        isTrendsetter: u.profile?.is_trendsetter || false,
        isPrivate: u.profile?.is_private || false,
        isBlocked: u.profile?.is_blocked || false,
        joinDate: u.date_joined,
        status: !u.is_active ? 'Suspended' : (u.profile?.is_blocked ? 'Blocked' : (u.is_staff ? 'Admin' : 'Active')),
        isStaff: u.is_staff
      }));

      setUsers(mapped);
      setTotalUsers(res.data.count);
      setHasMore(res.data.next !== null);
      setHasPrev(res.data.previous !== null);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers(1, searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      fetchUsers(newPage, searchTerm);
    }
  };

  const handlePrevPage = () => {
    if (hasPrev) {
      const newPage = page - 1;
      setPage(newPage);
      fetchUsers(newPage, searchTerm);
    }
  };



  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to completely delete this user?")) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_URL}/admin/users/${userId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh current page
      fetchUsers(page, searchTerm);
    } catch (err) {
      alert("Failed to delete user. They might be a superuser or the data is protected.");
    }
  };

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage accounts, roles, and permissions.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
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
                <th className="p-4 font-medium">Username</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role / Status</th>
                <th className="p-4 font-medium">Privacy</th>
                <th className="p-4 font-medium">Blocked</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-purple-600 rounded-full" />
                      <p className="mt-4 font-medium">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.profileImage && !user.profileImage.includes('default_avatar') ? (
                          <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <img 
                              src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:8000${user.profileImage}`} 
                              alt={user.username} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.target.onerror = null; 
                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </div>
                        )}
                        <span className="font-semibold">{user.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{user.email}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 ${!user.isTrendsetter && 'opacity-0'}`}>
                          Trendsetter
                        </span>
                        <span className={`text-xs ${user.status === 'Active' ? 'text-green-500' :
                          (user.status === 'Suspended' || user.status === 'Blocked') ? 'text-red-500' : 'text-yellow-500'
                          }`}>
                          • {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {user.isPrivate ?
                        <span className="flex items-center gap-1"><XCircle size={14} className="text-red-400" /> Private</span> :
                        <span className="flex items-center gap-1"><CheckCircle size={14} className="text-green-400" /> Public</span>
                      }
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {user.isBlocked ? 
                         <span className="text-red-500">Yes</span> : 
                         <span className="text-gray-400">No</span>
                      }
                    </td>
                    <td className="p-4 text-sm text-gray-500">{new Date(user.joinDate).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 isolate">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="inline-flex items-center gap-1 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition" title="Delete User">
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-gray-500">
                    No users found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Real Pagination Footer */}
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

export default AdminUsers;
