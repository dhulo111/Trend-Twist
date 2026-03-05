import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';

const BlockedPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reason = searchParams.get('reason') || 'Violation of community guidelines.';
  const until = searchParams.get('until');

  // Parse until date
  let formattedUntil = 'Permanently';
  if (until) {
    const untilDate = new Date(until);
    // If the date is more than 50 years from now, effectively permanent
    const isPermanent = untilDate.getFullYear() > new Date().getFullYear() + 50;
    formattedUntil = isPermanent ? 'Permanently' : untilDate.toLocaleDateString() + ' ' + untilDate.toLocaleTimeString();
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="w-full h-2 bg-red-600" />
        <div className="p-8 pb-10">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="text-red-600 dark:text-red-500" size={32} />
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Account Blocked</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6 text-sm">
            Your account has been restricted from accessing TrendTwist.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-8 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formattedUntil}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reason</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                {reason}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:admin@trendtwist.com"
              className="w-full flex items-center justify-center py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white gap-2"
            >
              <Mail size={16} /> Contact Support
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm gap-2"
            >
              <LogOut size={16} /> Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedPage;
