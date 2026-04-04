import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileText, MessageSquare, Video, Activity, TrendingUp, IndianRupee, ShieldCheck, CreditCard, Download, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    twists: 0,
    reels: 0,
    stories: 0,
    total_revenue: 0,
    total_fees: 0,
    pending_withdrawals_total: 0,
    pending_withdrawals_count: 0,
    chart_data: [],
    recent_activities: []
  });

  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        let query = `${API_URL}/admin/dashboard/?`;
        if (fromDate && toDate) {
          query += `from_date=${fromDate}&to_date=${toDate}`;
        }
        
        const res = await axios.get(query, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats({
          users: res.data.users || 0,
          posts: res.data.posts || 0,
          twists: res.data.twists || 0,
          reels: res.data.reels || 0,
          stories: res.data.stories || 0,
          total_revenue: res.data.total_revenue || 0,
          total_fees: res.data.total_fees || 0,
          pending_withdrawals_total: res.data.pending_withdrawals_total || 0,
          pending_withdrawals_count: res.data.pending_withdrawals_count || 0,
          chart_data: res.data.chart_data || [],
          recent_activities: res.data.recent_activities || [],
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [fromDate, toDate]);

  const handleGenerateReport = () => {
      if (!stats.chart_data || stats.chart_data.length === 0) return;
      
      const csvHeader = "Date,Users,Posts,Reels,Stories\n";
      const csvRows = stats.chart_data.map(d => `${d.name},${d.users},${d.posts},${d.reels},${d.stories}\n`).join('');
      const csvTotalSummary = `\nTOTALS (Filtered)\nUsers,${stats.users}\nPosts,${stats.posts}\nReels,${stats.reels}\nStories,${stats.stories}\n`;
      const csvContent = csvHeader + csvRows + csvTotalSummary;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      let filenameDate = fromDate && toDate ? `${fromDate}_to_${toDate}` : "Last_7_Days";
      link.setAttribute("download", `TrendTwist_Report_${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Platform Overview</h2>
          <p className="text-xs text-gray-500 mt-1">Metrics & Analytics for Trend Twist.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Calendar size={16} className="text-gray-500" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent text-sm focus:outline-none dark:text-gray-200" />
            <span className="text-gray-400">-</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent text-sm focus:outline-none dark:text-gray-200" />
          </div>
          <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors shadow-sm text-sm font-medium">
            <Download size={16} />
            Report
          </button>
          <Link to="/admin/earnings" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm text-sm font-bold">
            <IndianRupee size={16} />
            Payouts ({stats.pending_withdrawals_count})
          </Link>
        </div>
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
            Platform Engagement (Last 7 Days)
          </h3>
          <div className="flex-1 w-full h-full min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
               <RechartsLineChart data={stats.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} allowDecimals={false} />
                 <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                 <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                 <Line type="monotone" name="Users" dataKey="users" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} activeDot={{ r: 6 }} />
                 <Line type="monotone" name="Posts" dataKey="posts" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                 <Line type="monotone" name="Reels" dataKey="reels" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                 <Line type="monotone" name="Stories" dataKey="stories" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
               </RechartsLineChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 h-96 flex flex-col">
          <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
            <Activity size={20} className="text-blue-500" />
            Recent System Activity
          </h3>
          <div className="flex-1 overflow-auto space-y-4 pr-2">
            {stats.recent_activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity.</p>
            ) : (
                stats.recent_activities.map((act) => {
                  const date = new Date(act.time);
                  const timeStr = isNaN(date.getTime()) ? 'Recently' : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  return (
                  <div key={act.id} className="flex gap-4 items-start pb-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 last:pb-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      act.type === 'user' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600' :
                      act.type === 'post' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                      act.type === 'reel' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                    }`}>
                      {act.type === 'user' && <Users size={16} />}
                      {act.type === 'post' && <FileText size={16} />}
                      {act.type === 'reel' && <Video size={16} />}
                      {act.type === 'story' && <Activity size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {act.action.split('@')[0]}
                        {act.action.includes('@') && <span className="text-purple-500 font-bold">@{act.action.split('@')[1]}</span>}
                      </p>
                      <p className="text-xs text-gray-400">{timeStr} - {date.toLocaleDateString()}</p>
                    </div>
                  </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
