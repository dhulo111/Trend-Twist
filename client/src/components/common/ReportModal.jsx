import React, { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { X, AlertTriangle } from 'lucide-react';

const ReportModal = ({ isOpen, onClose, reportedUserId, contextData }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        reported_user: reportedUserId,
        reason: reason,
        ...contextData // e.g., { post: 1 }, { reel: 5 }
      };

      await axiosInstance.post('/reports/', payload);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <AlertTriangle size={20} className="text-amber-500" />
            Report Content
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h4 className="font-bold mb-1 text-gray-900 dark:text-gray-100">Report Submitted</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Thank you for keeping our community safe. Our team will review this shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Please describe why you're reporting this content. All reports are strictly confidential.
              </p>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason Category</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  required
                >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Spam or misleading">Spam or misleading</option>
                  <option value="Hate speech or symbols">Hate speech or symbols</option>
                  <option value="Violence or dangerous organizations">Violence or dangerous organizations</option>
                  <option value="Sale of illegal or regulated goods">Sale of illegal or regulated goods</option>
                  <option value="Bullying or harassment">Bullying or harassment</option>
                  <option value="Intellectual property violation">Intellectual property violation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!reason || submitting}
                  className="w-full flex items-center justify-center py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center justify-center py-2.5 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl mt-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
