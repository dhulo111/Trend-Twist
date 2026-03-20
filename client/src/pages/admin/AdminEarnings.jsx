import React, { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import {
  FaRupeeSign, FaCrown, FaSearch, FaCheckCircle, FaTimesCircle,
  FaChartBar, FaPercentage, FaHandHoldingUsd, FaAngleRight, FaArrowLeft
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
      <h3 className="text-3xl font-black text-white mb-0.5">{value}</h3>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
};

// ─── Creator Row ─────────────────────────────────────────────────────────────
const CreatorRow = ({ creator, onSelect }) => {
  const pending = parseFloat(creator.pending_payout);
  const isPending = pending > 0;
  return (
    <tr
      className="border-t border-gray-800 hover:bg-gray-800/40 cursor-pointer transition-colors"
      onClick={() => onSelect(creator)}
    >
      <td className="px-5 py-4 font-semibold text-white">@{creator.creator_username}</td>
      <td className="px-5 py-4 text-gray-300">₹{parseFloat(creator.total_gross).toFixed(2)}</td>
      <td className="px-5 py-4 text-pink-400 font-semibold">₹{parseFloat(creator.platform_fee_total).toFixed(2)}</td>
      <td className="px-5 py-4 text-green-400 font-semibold">₹{parseFloat(creator.creator_earnings_total).toFixed(2)}</td>
      <td className="px-5 py-4 text-blue-400">₹{parseFloat(creator.total_paid_out).toFixed(2)}</td>
      <td className="px-5 py-4">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPending ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'
          }`}>
          {isPending ? `₹${pending.toFixed(2)} pending` : 'Settled'}
        </span>
      </td>
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
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/admin/creators/${creator.creator_id}/payout/`)
      .then(r => setDetail(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [creator.creator_id]);

  const handlePay = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) { alert('Enter valid amount'); return; }
    setPaying(true);
    try {
      await api.post(`/admin/creators/${creator.creator_id}/payout/`, {
        amount: parseFloat(payAmount),
        note: payNote,
      });
      setSuccess(`✓ Payout of ₹${payAmount} marked as paid!`);
      setPayAmount('');
      setPayNote('');
      // Refresh detail
      const r = await api.get(`/admin/creators/${creator.creator_id}/payout/`);
      setDetail(r.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Payout failed');
    } finally { setPaying(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-500" />
    </div>
  );

  const pending = parseFloat(detail?.pending_payout || 0);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <FaArrowLeft /> Back to All Creators
      </button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">@{detail?.creator}</h2>
          <p className="text-gray-400 text-sm mt-0.5">Earnings & Payout History</p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3 text-center">
            <p className="text-xs text-gray-400">Total Earned</p>
            <p className="text-xl font-black text-green-400">₹{parseFloat(detail?.total_earned || 0).toFixed(2)}</p>
          </div>
          <div className={`${pending > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-gray-800 border-gray-700'} border rounded-xl px-5 py-3 text-center`}>
            <p className="text-xs text-gray-400">Pending Payout</p>
            <p className={`text-xl font-black ${pending > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
              ₹{pending.toFixed(2)}
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3 text-center">
            <p className="text-xs text-gray-400">Total Paid Out</p>
            <p className="text-xl font-black text-blue-400">₹{parseFloat(detail?.total_paid || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Pay Creator Form */}
      <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-5">
        <h4 className="font-bold text-white mb-1 flex items-center gap-2"><FaHandHoldingUsd className="text-yellow-400" /> Pay Creator</h4>
        <p className="text-xs text-gray-400 mb-4">Mark a payment as distributed to this creator. This records it in your books.</p>
        {success && <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl">{success}</div>}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number" step="0.01" min="0.01"
                placeholder={pending > 0 ? pending.toFixed(2) : '0.00'}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="pl-7 pr-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-yellow-500 w-36"
              />
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-400 block mb-1">Note (optional)</label>
            <input
              type="text" placeholder="e.g. Bank transfer, PayPal..."
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-yellow-500 w-full"
            />
          </div>
          <button
            onClick={handlePay} disabled={paying || !payAmount}
            className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-sm rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 shadow-lg"
          >
            {paying ? 'Saving...' : 'Mark as Paid'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h4 className="font-bold text-white mb-3">Transaction History</h4>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Platform 20%</th>
                <th className="px-4 py-3">Creator 80%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {detail?.earnings?.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">No transactions yet.</td></tr>
              )}
              {detail?.earnings?.map(e => (
                <tr key={e.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">@{e.subscriber}</td>
                  <td className="px-4 py-3 capitalize">{e.tier}</td>
                  <td className="px-4 py-3">₹{e.gross_amount}</td>
                  <td className="px-4 py-3 text-pink-400">₹{e.platform_fee}</td>
                  <td className="px-4 py-3 text-green-400 font-semibold">₹{e.creator_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout History */}
      <div>
        <h4 className="font-bold text-white mb-3">Payout History</h4>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {detail?.payouts?.length === 0 && (
                <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No payouts recorded yet.</td></tr>
              )}
              {detail?.payouts?.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">₹{p.amount}</td>
                  <td className="px-4 py-3 text-gray-400">{p.note || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-500/10 text-green-400 text-xs font-bold px-2 py-1 rounded-full capitalize">
                      {p.status}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminEarnings Page
// ─────────────────────────────────────────────────────────────────────────────
const AdminEarnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);

  useEffect(() => {
    api.get('/admin/earnings/')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = (data?.creators || []).filter(c =>
    c.creator_username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center items-center h-60">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-500" />
    </div>
  );

  if (selectedCreator) {
    return <CreatorDetail creator={selectedCreator} onBack={() => setSelectedCreator(null)} />;
  }

  const grossTotal = parseFloat(data?.platform_total_revenue || 0);
  const feeTotal = parseFloat(data?.platform_total_fee_collected || 0);
  const creatorTotal = grossTotal - feeTotal;
  const totalPendingPayout = (data?.creators || [])
    .reduce((acc, c) => acc + Math.max(parseFloat(c.pending_payout), 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white flex items-center gap-3">
        <FaRupeeSign className="text-green-400" /> Revenue & Payouts
      </h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FaChartBar />} label="Total Revenue" value={`₹${grossTotal.toFixed(2)}`} color="purple" sub="All subscription payments" />
        <StatCard icon={<FaPercentage />} label="Platform Fee (20%)" value={`₹${feeTotal.toFixed(2)}`} color="pink" sub="Admin earnings" />
        <StatCard icon={<FaRupeeSign />} label="Creator Earnings" value={`₹${creatorTotal.toFixed(2)}`} color="green" sub="80% owed to creators" />
        <StatCard icon={<FaHandHoldingUsd />} label="Pending Payouts" value={`₹${totalPendingPayout.toFixed(2)}`} color="blue" sub="Not yet distributed" />
      </div>

      {/* Search + Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            <input
              placeholder="Search creator..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <p className="text-gray-500 text-sm ml-auto">{filtered.length} creator{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3">Creator</th>
                <th className="px-5 py-3">Total Revenue</th>
                <th className="px-5 py-3">Platform (20%)</th>
                <th className="px-5 py-3">Creator Share (80%)</th>
                <th className="px-5 py-3">Paid Out</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-gray-500">
                    No creators with earnings found.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <CreatorRow key={c.creator_id} creator={c} onSelect={setSelectedCreator} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminEarnings;
