import React, { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import {
  FaRupeeSign, FaCrown, FaSearch, FaCheckCircle, FaTimesCircle,
  FaChartBar, FaPercentage, FaHandHoldingUsd, FaAngleRight, FaArrowLeft,
  FaWallet, FaHistory, FaUserCircle, FaCreditCard, FaUniversity, FaFileCsv
} from 'react-icons/fa';

// ─── Overview Card ────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'purple' }) => {
  const colors = {
    purple: 'from-purple-500/20 to-purple-900/20 border-purple-500/30',
    pink: 'from-pink-500/20 to-pink-900/20 border-pink-500/30',
    green: 'from-green-500/20 to-green-900/20 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-900/20 border-blue-500/30',
  };
  const iconColors = { purple: 'text-purple-400', pink: 'text-pink-400', green: 'text-green-400', blue: 'text-blue-400' };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border p-5 rounded-2xl relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-400 text-sm font-semibold">{label}</p>
        <span className={`text-xl ${iconColors[color]}`}>{icon}</span>
      </div>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-0.5">{value}</h3>
      {sub && <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">{sub}</p>}
    </div>
  );
};

// ─── Withdrawal Row ─────────────────────────────────────────────────────────────
const WithdrawalRow = ({ item, onAction }) => {
  const isPending = item.status === 'pending';
  const methodIcon = item.payment_method === 'upi' ? <FaCreditCard className="text-blue-400" /> : <FaUniversity className="text-purple-400" />;

  return (
    <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800/20 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
           <FaUserCircle className="text-gray-600 text-lg" />
           <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">@{item.creator_username || 'Creator'}</p>
              <p className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
           </div>
        </div>
      </td>
      <td className="px-5 py-4 font-black text-gray-900 dark:text-white">₹{parseFloat(item.amount).toFixed(2)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
           {methodIcon}
           <span className="capitalize">{item.payment_method}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
          item.status === 'completed' ? 'bg-green-500/10 text-green-400' :
          item.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
          'bg-yellow-500/10 text-yellow-400'
        }`}>
          {item.status}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        {isPending ? (
          <div className="flex items-center justify-end gap-2">
            <button
               onClick={() => onAction(item.id, 'completed')}
               className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/30 transition-colors"
               title="Approve & Complete"
            >
              <FaCheckCircle />
            </button>
            <button
               onClick={() => onAction(item.id, 'rejected')}
               className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/30 transition-colors"
               title="Reject"
            >
              <FaTimesCircle />
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-600 italic">Processed</span>
        )}
      </td>
    </tr>
  );
};

// ─── Creator Result Row ─────────────────────────────────────────────────────────
const CreatorRow = ({ creator, onSelect }) => {
  return (
    <tr
      className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800/40 cursor-pointer transition-colors"
      onClick={() => onSelect(creator)}
    >
      <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">@{creator.creator_username}</td>
      <td className="px-5 py-4 text-gray-300">₹{parseFloat(creator.total_gross).toFixed(2)}</td>
      <td className="px-5 py-4 text-pink-400 font-semibold">₹{parseFloat(creator.platform_fee_total).toFixed(2)}</td>
      <td className="px-5 py-4 text-green-400 font-semibold">₹{parseFloat(creator.creator_earnings_total).toFixed(2)}</td>
      <td className="px-5 py-4 text-blue-400">₹{parseFloat(creator.total_withdrawn).toFixed(2)}</td>
      <td className="px-5 py-4 text-gray-500">
        <FaAngleRight />
      </td>
    </tr>
  );
};

// ─── Creator Detail Modal ─────────────────────────────────────────────────────
const CreatorDetail = ({ creator, onBack }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/creators/${creator.creator_id}/payout/`)
      .then(r => setDetail(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [creator.creator_id]);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:text-white transition-colors text-sm">
        <FaArrowLeft /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">@{detail?.creator}</h2>
          <p className="text-gray-400 text-sm mt-0.5">Comprehensive Financial Overview</p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase">Total Earned</p>
            <p className="text-xl font-black text-green-400">₹{parseFloat(detail?.total_earned || 0).toFixed(2)}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase">Available Balance</p>
            <p className="text-xl font-black text-blue-400">₹{parseFloat(detail?.available_balance || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><FaChartBar className="text-purple-400" /> Subscription Credits</h4>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Admin (20%)</th>
                <th className="px-4 py-3">Creator (80%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
              {detail?.earnings?.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">No transactions recorded.</td></tr>
              )}
              {detail?.earnings?.map(e => (
                <tr key={e.id} className="hover:bg-gray-100 dark:bg-gray-800/30">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">@{e.subscriber}</td>
                  <td className="px-4 py-3 capitalize">{e.tier}</td>
                  <td className="px-4 py-3 text-gray-400">₹{parseFloat(e.gross_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-pink-400">₹{parseFloat(e.platform_fee).toFixed(2)}</td>
                  <td className="px-4 py-3 text-green-400 font-black">₹{parseFloat(e.creator_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal History */}
      <div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><FaHistory className="text-blue-400" /> Withdrawal History</h4>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
              {detail?.withdrawals?.length === 0 && (
                <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No withdrawals requested yet.</td></tr>
              )}
              {detail?.withdrawals?.map(w => (
                <tr key={w.id} className="hover:bg-gray-100 dark:bg-gray-800/30">
                  <td className="px-4 py-3">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-black">₹{parseFloat(w.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{w.payment_method}</td>
                  <td className="px-4 py-3">
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        w.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        w.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                     }`}>
                        {w.status}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Main AdminEarnings Page ──────────────────────────────────────────────────
const AdminEarnings = () => {
  const [data, setData] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [activeTab, setActiveTab] = useState('withdrawals'); // withdrawals | creators

  const fetchData = async () => {
    try {
      const [revRes, withRes] = await Promise.all([
        api.get('/admin/earnings/'),
        api.get('/admin/withdrawals/')
      ]);
      setData(revRes.data);
      setWithdrawals(Array.isArray(withRes.data) ? withRes.data : (withRes.data.results || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id, status) => {
    const note = prompt(`Enter optional note for ${status === 'completed' ? 'approval' : 'rejection'}:`);
    if (note === null) return; // cancel

    try {
      await api.post(`/admin/withdrawals/${id}/action/`, { status, admin_note: note });
      fetchData(); // Refresh all
    } catch (e) {
      alert('Failed to update withdrawal status.');
    }
  };

  const filteredCreators = (data?.creators || []).filter(c =>
    c.creator_username.toLowerCase().includes(search.toLowerCase())
  );

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  if (loading) return (
    <div className="flex justify-center items-center h-60">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-500" />
    </div>
  );

  if (selectedCreator) {
    return <CreatorDetail creator={selectedCreator} onBack={() => setSelectedCreator(null)} />;
  }

  const grossTotal = parseFloat(data?.platform_total_revenue || 0);
  const feeTotal = parseFloat(data?.platform_total_fee_collected || 0);
  const creatorTotal = grossTotal - feeTotal;
  const totalPendingPayout = (data?.creators || [])
    .reduce((acc, c) => acc + parseFloat(c.pending_payout || 0), 0);

  const handleGenerateReport = () => {
    if (!data || !data.creators) return;

    let creatorsToExport = search ? filteredCreators : data.creators;

    const csvRows = [];
    // Summary Headers
    csvRows.push(['REPORT SUMMARY', '', '', '', '']);
    csvRows.push(['Total Gross Volume', 'Platform Net (Fee)', 'Creator Net Share', 'Total Pending Payout', '']);
    csvRows.push([
      grossTotal.toFixed(2),
      feeTotal.toFixed(2),
      creatorTotal.toFixed(2),
      totalPendingPayout.toFixed(2),
      ''
    ]);
    
    csvRows.push(['', '', '', '', '']); // empty line

    // Creator Headers
    csvRows.push([
      'Creator Username',
      'Total Revenue Generated',
      'Admin Commission (Cut)',
      'Creator Net Earned',
      'Total Withdrawn',
      'Pending Payout (Not Withdrawn)'
    ]);

    creatorsToExport.forEach(c => {
      csvRows.push([
        c.creator_username,
        parseFloat(c.total_gross || 0).toFixed(2),
        parseFloat(c.platform_fee_total || 0).toFixed(2),
        parseFloat(c.creator_earnings_total || 0).toFixed(2),
        parseFloat(c.total_withdrawn || 0).toFixed(2),
        parseFloat(c.pending_payout || 0).toFixed(2)
      ]);
    });

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `TrendTwist_Financial_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div className="flex items-center flex-wrap gap-4">
           <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
             <FaWallet className="text-purple-500" /> Wealth Management
           </h1>
           <button 
             onClick={handleGenerateReport}
             className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all"
           >
             <FaFileCsv /> Generate Financial Report
           </button>
         </div>
         <div className="text-left sm:text-right">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Platform Economy</p>
            <p className="text-xs text-gray-400 font-bold">Total System Volume: ₹{grossTotal.toLocaleString()}</p>
         </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FaChartBar />} label="Gross Volume" value={`₹${grossTotal.toLocaleString()}`} color="purple" sub="Total User Spending" />
        <StatCard icon={<FaPercentage />} label="Platform Net" value={`₹${feeTotal.toLocaleString()}`} color="pink" sub="20% Service Fee" />
        <StatCard icon={<FaRupeeSign />} label="Creator Share" value={`₹${creatorTotal.toLocaleString()}`} color="green" sub="Earned by Creators" />
        <StatCard icon={<FaHandHoldingUsd />} label="Pending Exit" value={`₹${totalPendingPayout.toLocaleString()}`} color="blue" sub="In withdrawal Queue" />
      </div>

      {/* Tab Controls */}
      <div className="flex items-center gap-2 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-fit">
         <button 
            onClick={() => setActiveTab('withdrawals')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
         >
            Withdrawal Queue {pendingWithdrawals.length > 0 && <span className="ml-1 bg-white text-purple-600 px-1.5 py-0.5 rounded-full text-[8px] font-black">{pendingWithdrawals.length}</span>}
         </button>
         <button 
            onClick={() => setActiveTab('creators')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'creators' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
         >
            Creator Master List
         </button>
      </div>

      {activeTab === 'withdrawals' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                 <FaCreditCard className="text-yellow-400" /> Pending Requests
              </h3>
              <p className="text-xs text-gray-500 italic">Total Requests: {withdrawals.length}</p>
           </div>
           
           <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800/80 text-gray-500 text-xs uppercase font-black">
                       <tr>
                          <th className="px-5 py-3">Creator / Date</th>
                          <th className="px-5 py-3">Amount</th>
                          <th className="px-5 py-3">Method</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800/30">
                       {withdrawals.length === 0 ? (
                          <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-500 italic">No withdrawal requests found.</td></tr>
                       ) : (
                          withdrawals.map(item => <WithdrawalRow key={item.id} item={item} onAction={handleAction} />)
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
           <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                 <FaCrown className="text-pink-400" /> Creator Performances
              </h3>
              <div className="relative w-64">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                <input
                  placeholder="Filter by name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-700 rounded-lg text-gray-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
           </div>

           <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800/80 text-gray-500 text-xs uppercase font-black">
                    <tr>
                      <th className="px-5 py-3">Creator</th>
                      <th className="px-5 py-3">Gross Revenue</th>
                      <th className="px-5 py-3">Platform (20%)</th>
                      <th className="px-5 py-3">Earnings (80%)</th>
                      <th className="px-5 py-3">Redeemed</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800/30">
                    {filteredCreators.length === 0 ? (
                      <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-500 italic">No matches found.</td></tr>
                    ) : (
                      filteredCreators.map(c => <CreatorRow key={c.creator_id} creator={c} onSelect={setSelectedCreator} />)
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminEarnings;
