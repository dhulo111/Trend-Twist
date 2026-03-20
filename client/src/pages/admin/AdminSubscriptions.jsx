import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCrown, FaSearch, FaCheckCircle, FaTimesCircle, FaRegClock } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminSubscriptions = () => {
    const TIERS = ['basic', 'pro', 'elite'];
    const TIER_LABELS = { basic: '🔵 Basic', pro: '🟡 Pro', elite: '💜 Elite' };

    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState({ total_active: 0, total_pro: 0, total_elite: 0 });

    const [plans, setPlans] = useState({ basic: null, pro: null, elite: null });
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [saving, setSaving] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({
        basic: { price: '', features: '' },
        pro: { price: '', features: '' },
        elite: { price: '', features: '' },
    });
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const res = await axios.get(`${API_URL}/admin/global-plans/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const mapped = { basic: null, pro: null, elite: null };
                const fd = { basic: { price: '', features: '' }, pro: { price: '', features: '' }, elite: { price: '', features: '' } };
                res.data.forEach(p => {
                    mapped[p.tier] = p;
                    fd[p.tier] = { price: p.price, features: p.features || '' };
                });
                setPlans(mapped);
                setForm(fd);
            } catch (e) {
                console.error('Failed to load global plans:', e);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSavePlan = async (tier) => {
        const { price, features } = form[tier];
        if (!price || parseFloat(price) <= 0) { alert('Valid price required.'); return; }
        setSaving(tier);
        try {
            const token = localStorage.getItem('access_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.post(`${API_URL}/admin/global-plans/`, { tier, price: parseFloat(price), features }, { headers });
            setSuccessMsg(`${TIER_LABELS[tier]} plan saved!`);
            setTimeout(() => setSuccessMsg(''), 3000);
            const res = await axios.get(`${API_URL}/admin/global-plans/`, { headers });
            const mapped = { basic: null, pro: null, elite: null };
            res.data.forEach(p => { mapped[p.tier] = p; });
            setPlans(mapped);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to save plan.');
        } finally { setSaving(null); }
    };

    const handleDeletePlan = async (tier) => {
        if (!window.confirm(`Deactivate ${tier} tier globally? Active subscribers will be impacted.`)) return;
        setDeleting(tier);
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`${API_URL}/admin/global-plans/`, { 
                data: { tier },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPlans(prev => ({ ...prev, [tier]: null }));
            setForm(prev => ({ ...prev, [tier]: { price: '', features: '' } }));
            setSuccessMsg(`${TIER_LABELS[tier]} deactivated.`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to deactivate.');
        } finally { setDeleting(null); }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchSubscriptions();
        }, 500);
        return () => clearTimeout(debounce);
    }, [page, searchQuery]);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/admin/subscriptions/?page=${page}&search=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSubscriptions(response.data.results);
            setTotalPages(Math.ceil(response.data.count / 10));
            // Temporary simple stats calculation (Ideally backend provides this)
            const active = response.data.results.filter(s => s.status === 'active').length;
            const pro = response.data.results.filter(s => s.tier === 'pro').length;
            const elite = response.data.results.filter(s => s.tier === 'elite').length;
            setStats({ total_active: active, total_pro: pro, total_elite: elite });
        } catch (error) {
            console.error('Failed to fetch subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-semibold flex items-center w-max"><FaCheckCircle className="mr-1" /> Active</span>;
            case 'past_due':
                return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-semibold flex items-center w-max"><FaRegClock className="mr-1" /> Past Due</span>;
            default:
                return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-semibold flex items-center w-max"><FaTimesCircle className="mr-1" /> Canceled</span>;
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-black text-white flex items-center">
                <FaCrown className="mr-3 text-pink-500" /> Premium Subscriptions
            </h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/80 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><FaCrown className="text-6xl text-white" /></div>
                    <p className="text-gray-400 font-semibold mb-1">Active Subscriptions</p>
                    <h3 className="text-4xl font-black text-white">{stats.total_active}</h3>
                </div>
                <div className="bg-gray-800/80 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                    <p className="text-gray-400 font-semibold mb-1">Pro Tier</p>
                    <h3 className="text-4xl font-black text-white">{stats.total_pro}</h3>
                </div>
                <div className="bg-gray-800/80 p-6 rounded-2xl border border-purple-500/30 relative overflow-hidden">
                    <p className="text-purple-400 font-semibold mb-1">Elite Tier</p>
                    <h3 className="text-4xl font-black text-white">{stats.total_elite}</h3>
                </div>
            </div>

            {/* Global Tiers Management */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Manage Global Subscription Tiers</h2>
                <p className="text-sm text-gray-400 mb-6">Configure the base pricing and features for the 3 global subscription tiers that users can select to support their favorite creators.</p>
                {successMsg && (
                    <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl">{successMsg}</div>
                )}
                {loadingPlans ? <div className="text-gray-500 py-4">Loading plans...</div> : (
                    <div className="space-y-4">
                        {TIERS.map(tier => (
                            <div key={tier} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="font-bold text-white text-base">{TIER_LABELS[tier]}</p>
                                        <p className="text-xs text-gray-400 capitalize">{tier} Tier Pricing</p>
                                    </div>
                                    {plans[tier] ? (
                                        <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full font-bold">Active · ₹{plans[tier].price}/mo</span>
                                    ) : (
                                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-full">Not Configured</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Monthly Price (INR)</label>
                                        <input type="number" step="0.01" value={form[tier].price} onChange={e => setForm(prev => ({ ...prev, [tier]: { ...prev[tier], price: e.target.value } }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-pink-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Global Features (comma-separated)</label>
                                        <input type="text" value={form[tier].features} onChange={e => setForm(prev => ({ ...prev, [tier]: { ...prev[tier], features: e.target.value } }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-pink-500 focus:outline-none" />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    {plans[tier] && (
                                        <button onClick={() => handleDeletePlan(tier)} disabled={deleting === tier} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-lg border border-red-500/20 transition-colors">
                                            {deleting === tier ? 'Deactivating...' : 'Deactivate'}
                                        </button>
                                    )}
                                    <button onClick={() => handleSavePlan(tier)} disabled={saving === tier} className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-colors">
                                        {saving === tier ? 'Saving...' : plans[tier] ? 'Update Tier' : 'Create Tier'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div className="relative w-full md:w-96 mb-4 md:mb-0">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by username..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-pink-500"
                    />
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-300">
                        <thead className="bg-gray-800 text-gray-400 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Subscriber</th>
                                <th className="px-6 py-4">Creator</th>
                                <th className="px-6 py-4">Tier</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Start Date</th>
                                <th className="px-6 py-4">Expiry Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        Loading subscriptions...
                                    </td>
                                </tr>
                            ) : subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No subscriptions found.
                                    </td>
                                </tr>
                            ) : (
                                subscriptions.map(sub => (
                                    <tr key={sub.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold">{sub.subscriber}</td>
                                        <td className="px-6 py-4 font-semibold text-pink-400">@{sub.creator}</td>
                                        <td className="px-6 py-4 capitalize font-bold">
                                            {sub.tier === 'elite' ? <span className="text-purple-400">Elite</span> : sub.tier === 'pro' ? <span className="text-yellow-400">Pro</span> : <span className="text-blue-400">Basic</span>}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={sub.status} /></td>
                                        <td className="px-6 py-4 text-sm">{new Date(sub.start_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm">{sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-800/30 flex justify-between items-center border-t border-gray-800">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 bg-gray-800 rounded-lg text-white disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-gray-400">Page {page} of {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 bg-gray-800 rounded-lg text-white disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSubscriptions;
