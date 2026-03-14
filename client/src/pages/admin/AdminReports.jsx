import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, Ban, UserX } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const PAGE_SIZE = 10;

  // Blocking Modal State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUserToBlock, setSelectedUserToBlock] = useState(null);
  const [blockDuration, setBlockDuration] = useState('1');
  const [blockReason, setBlockReason] = useState('');

  const fetchReports = async (pageNum = 1, status = 'pending') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API_URL}/admin/reports/?page=${pageNum}&status=${status}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReports(res.data.results);
      setTotalReports(res.data.count);
      setHasMore(res.data.next !== null);
      setHasPrev(res.data.previous !== null);
    } catch (error) {
      console.error("Error fetching admin reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1, statusFilter);
  }, [statusFilter]);

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      fetchReports(newPage, statusFilter);
    }
  };

  const handlePrevPage = () => {
    if (hasPrev) {
      const newPage = page - 1;
      setPage(newPage);
      fetchReports(newPage, statusFilter);
    }
  };

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(`${API_URL}/admin/reports/${reportId}/`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh
      fetchReports(page, statusFilter);
    } catch (err) {
      alert("Failed to update report status.");
    }
  };

  const handleOpenBlockModal = (user) => {
    setSelectedUserToBlock(user);
    setShowBlockModal(true);
  };

  const handleBlockUser = async () => {
    if (!selectedUserToBlock) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_URL}/admin/users/${selectedUserToBlock.id}/block/`,
        { duration: blockDuration, reason: blockReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowBlockModal(false);
      setBlockReason('');
      // Mark all related reports as resolved implicitly, so just completely refresh current list
      fetchReports(1, statusFilter);
      alert(`User @${selectedUserToBlock.username} has been blocked.`);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to block user. They might be an admin.");
    }
  };

  const handleUnblockUser = async (user) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_URL}/admin/users/${user.id}/unblock/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports(page, statusFilter);
      alert(`User @${user.username} has been unblocked.`);
    } catch (err) {
      alert("Failed to unblock user.");
    }
  };

  const totalPages = Math.ceil(totalReports / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Review community reports and moderate accounts.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="py-2 pl-3 pr-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-medium w-16">Reporter</th>
                <th className="p-4 font-medium w-1/4">Reported Acc.</th>
                <th className="p-4 font-medium w-1/3">Reason</th>
                <th className="p-4 font-medium">Content Ref</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Moderations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-purple-600 rounded-full" />
                      <p className="mt-4 font-medium">Loading reports...</p>
                    </div>
                  </td>
                </tr>
              ) : reports.length > 0 ? (
                reports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-gray-900 dark:text-gray-200">@{report.reporter.username}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-red-600 dark:text-red-400">@{report.reported_user.username}</span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {report.reason}
                      </p>
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-500">
                      {report.post_id && <div>Post ID: {report.post_id}</div>}
                      {report.reel_id && <div>Reel ID: {report.reel_id}</div>}
                      {report.twist_id && <div>Twist ID: {report.twist_id}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
                                                ${report.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                                                ${report.status === 'dismissed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : ''}
                                            `}>
                        {report.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 isolate">
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateReportStatus(report.id, 'dismissed')}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition" title="Dismiss Report">
                              <XCircle size={16} />
                            </button>
                            <button
                              onClick={() => updateReportStatus(report.id, 'resolved')}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition" title="Mark Resolved">
                              <CheckCircle size={16} />
                            </button>
                          </>
                        )}
                        {report.reported_user.is_blocked ? (
                          <button
                            onClick={() => handleUnblockUser(report.reported_user)}
                            className="inline-flex items-center gap-1 p-1.5 ml-2 text-white bg-green-600 hover:bg-green-700 rounded-md transition font-medium text-xs shadow-sm" title="Unblock User">
                            <CheckCircle size={14} /> Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenBlockModal(report.reported_user)}
                            className="inline-flex items-center gap-1 p-1.5 ml-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition font-medium text-xs shadow-sm" title="Block User">
                            <Ban size={14} /> Block user
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-gray-500">
                    <ShieldAlert size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>No reports found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30 dark:bg-gray-900/30">
          <span>Showing page <span className="font-semibold text-gray-900 dark:text-gray-100">{page}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span> ({totalReports} total reports)</span>
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

      {/* Block Modal */}
      {showBlockModal && selectedUserToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center">
                <UserX size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Block @{selectedUserToBlock.username}</h3>
                <p className="text-sm text-gray-500">Prevent this user from accessing the platform</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block Duration</label>
                <select
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value)}
                  className="w-full text-sm block px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="1">1 Day</option>
                  <option value="5">5 Days</option>
                  <option value="7">7 Days</option>
                  <option value="permanent">Permanently</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Blocking</label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows="3"
                  placeholder="This reason will be shown to the user..."
                  className="w-full text-sm block px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={!blockReason.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
