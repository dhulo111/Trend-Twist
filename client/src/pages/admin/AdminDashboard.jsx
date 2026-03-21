import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileText, MessageSquare, Video, Activity, TrendingUp, IndianRupee, ShieldCheck, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    twists: 0,
    reels: 0,
    total_revenue: 0,
    total_fees: 0,
    pending_withdrawals_total: 0,
    pending_withdrawals_count: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get(`${API_URL}/admin/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats({
          users: res.data.users || 0,
          posts: res.data.posts || 0,
          twists: res.data.twists || 0,
          reels: res.data.reels || 0,
          total_revenue: res.data.total_revenue || 0,
          total_fees: res.data.total_fees || 0,
          pending_withdrawals_total: res.data.pending_withdrawals_total || 0,
          pending_withdrawals_count: res.data.pending_withdrawals_count || 0,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { title: 'Total Revenue', value: stats.total_revenue, symbol: '₹', icon: IndianRupee, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/40' },
    { title: 'Commission (Fee)', value: stats.total_fees, symbol: '₹', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
    { title: 'Pending Payouts', value: stats.pending_withdrawals_total, symbol: '₹', icon: CreditCard, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/40', link: '/admin/earnings' },
    { title: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  ];

  if (loading) return (
    <div className="flex-1 p-8 animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Platform Overview</h2>
          <p className="text-xs text-gray-500 mt-1">Real-time metrics for Trend Twist Economy.</p>
        </div>
        <Link to="/admin/earnings" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm text-sm font-bold">
          <Activity size={18} />
          Go to Payout Queue ({stats.pending_withdrawals_count})
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${card.color}`}>
              <card.icon size={80} strokeWidth={1.5} />
            </div>

            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize mb-2">{card.title}</dt>

            <div className="flex items-baseline gap-3 relative z-10">
              <dd className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {card.symbol && <span className="text-xl mr-1 opacity-60 font-medium">{card.symbol}</span>}
                {card.value.toLocaleString(undefined, { minimumFractionDigits: card.symbol ? 2 : 0, maximumFractionDigits: card.symbol ? 2 : 0 })}
              </dd>
              {card.link && (
                 <Link to={card.link} className="text-[10px] font-bold text-purple-500 hover:underline">Manage &rarr;</Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Placeholder for Charts / Recent Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 h-96 flex flex-col">
          <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
            <TrendingUp size={20} className="text-purple-500" />
            User Growth
          </h3>
          <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            Chart Component Here
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 h-96 flex flex-col">
          <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
            <Activity size={20} className="text-blue-500" />
            Recent System Activity
          </h3>
          <div className="flex-1 overflow-auto space-y-4 pr-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-start pb-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">New user registered: <span className="text-purple-500 font-bold">@alex{i}</span></p>
                  <p className="text-xs text-gray-400">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
