// frontend/src/pages/SettingsPage.jsx

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import { IoLogOutOutline, IoColorPaletteOutline, IoPersonOutline, IoLockClosedOutline, IoArchiveOutline, IoBookmarkOutline } from 'react-icons/io5';
import { FaCrown } from 'react-icons/fa';
import api from '../api/axiosInstance';
import StoryArchive from '../components/features/feed/StoryArchive';
import SavedItems from '../components/features/profile/SavedItems';

const SettingsPage = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const { theme, ThemeToggle } = useContext(ThemeContext);

  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Placeholder for account deletion logic (requires backend)
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Tab Content Components ---

  const AccountSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-text-primary">Account Details</h3>

      <div className="space-y-3 rounded-lg border border-border bg-background-secondary p-4">
        <p className="text-sm text-text-secondary">
          Username: <span className="font-medium text-text-primary">{user?.username}</span>
        </p>
        <p className="text-sm text-text-secondary">
          Email: <span className="font-medium text-text-primary">{user?.email}</span>
        </p>
      </div>

      <h3 className="text-xl font-semibold text-text-primary">Danger Zone</h3>
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-3">
        <p className="text-sm font-medium text-red-500">
          Permanently delete your account. This action cannot be undone.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm('Are you absolutely sure you want to delete your account?')) {
              // TODO: Implement actual delete API call
              setIsDeleting(true);
              setTimeout(() => {
                setIsDeleting(false);
                logoutUser(); // Log out after fake deletion
              }, 2000);
            }
          }}
          disabled={isDeleting}
        >
          {isDeleting ? <Spinner size="sm" /> : 'Delete Account'}
        </Button>
      </div>
    </div>
  );

  const ThemeSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-text-primary">Appearance</h3>
      <div className="flex items-center justify-between rounded-lg border border-border bg-background-secondary p-4">
        <div>
          <p className="font-medium text-text-primary">Color Theme</p>
          <p className="text-sm text-text-secondary">
            Current: <span className="capitalize">{theme}</span> Mode
          </p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );

  const SecuritySettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-text-primary">Security</h3>
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <p className="text-sm text-text-secondary">
          Since we use passwordless login (OTP), your primary security is linked to your email.
        </p>
      </div>

      {/* Example: Change Email/Password (Currently not needed for OTP) */}
      <Button variant="secondary" disabled={true}>
        {/* Placeholder: If we ever add traditional passwords */}
        Change Email/Password (Not implemented)
      </Button>
    </div>
  );

  const MonetizationSettings = () => {
    const [portalLoading, setPortalLoading] = useState(false);
    const [subs, setSubs] = useState([]);
    const [subsLoading, setSubsLoading] = useState(true);

    React.useEffect(() => {
      const fetchSubs = async () => {
        try {
          const res = await api.get('/subscriptions/me/');
          setSubs(res.data);
        } catch (e) {
          console.error('Failed to fetch subscriptions:', e);
        } finally {
          setSubsLoading(false);
        }
      };
      fetchSubs();
    }, []);

    const hasStripeSubscription = subs.some(s => s.stripe_subscription_id);

    const handleBillingPortal = async () => {
      setPortalLoading(true);
      try {
        const response = await api.post('/subscriptions/portal/');
        if (response.data.url) {
          window.location.href = response.data.url;
        }
      } catch (err) {
        console.error('Failed to load billing portal:', err.message);
        alert(err.response?.data?.error || 'Could not launch Stripe Portal.');
      } finally {
        setPortalLoading(false);
      }
    };

    const tierColors = {
      basic: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      pro: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      elite: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    };
    const statusColors = {
      active: 'text-green-400 bg-green-500/10',
      past_due: 'text-yellow-400 bg-yellow-500/10',
      canceled: 'text-red-400 bg-red-500/10',
    };

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-text-primary flex items-center">
          <FaCrown className="mr-2 text-pink-500" /> My Subscriptions
        </h3>

        {/* Active Subscriptions List */}
        {subsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : subs.length === 0 ? (
          <div className="rounded-xl border border-border bg-background-secondary p-8 text-center">
            <FaCrown className="text-4xl text-gray-600 mx-auto mb-3" />
            <h4 className="font-bold text-text-primary mb-1">No Active Subscriptions</h4>
            <p className="text-sm text-text-secondary">
              You haven't subscribed to any creators yet. Browse profiles to find exclusive content.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map(sub => (
              <div key={sub.id} className="rounded-xl border border-border bg-background-secondary p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold capitalize ${tierColors[sub.tier] || tierColors.basic}`}>
                    {sub.tier} Tier
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">
                      @{sub.creator_username || sub.creator}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Renews: {sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColors[sub.status] || ''}`}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Billing Portal */}
        {hasStripeSubscription ? (
          <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-text-primary">Manage Billing</h4>
              <p className="text-xs text-text-secondary mt-0.5">Update card, download invoices, or cancel plans via Stripe.</p>
            </div>
            <Button
              variant="primary"
              onClick={handleBillingPortal}
              disabled={portalLoading}
              className="whitespace-nowrap shadow-lg hover:shadow-pink-500/30"
            >
              {portalLoading ? <Spinner size="sm" /> : 'Open Billing Portal'}
            </Button>
          </div>
        ) : subs.length > 0 ? (
          <p className="text-xs text-center text-text-secondary">
            Billing portal is available for subscriptions paid via Stripe checkout.
          </p>
        ) : null}
      </div>
    );
  };

  const CreatorEarningsSettings = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
      const fetchEarnings = async () => {
        try {
          const res = await api.get('/creators/me/earnings/');
          setData(res.data);
        } catch (e) {
          console.error('Failed to load earnings:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchEarnings();
    }, []);

    if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

    if (!data) return (
      <div className="text-center py-8 text-text-secondary">
        Could not load your earnings data at this time.
      </div>
    );

    const pending = parseFloat(data.pending_payout);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-text-primary flex items-center">
            <FaCrown className="mr-2 text-yellow-400" /> Creator Earnings & Analytics
          </h3>
          <p className="text-sm text-text-secondary mt-1">Track your subscription revenue and pending payouts.</p>
        </div>

        {/* Terms & Conditions */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-700/80 dark:text-yellow-300/80 space-y-1">
          <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">📌 Terms & Conditions</p>
          <p>• {data.terms}</p>
          <p>• Payouts are transferred automatically to your linked account when initiated by the admin.</p>
          <p>• By continuing to grow your subscriber base, you lock in recurring monthly revenue on all active plans.</p>
        </div>

        {/* Earning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background-primary border border-border p-4 rounded-xl">
            <p className="text-xs text-text-secondary font-medium">Total Earned (80%)</p>
            <p className="text-2xl font-bold text-green-400 mt-1">₹{parseFloat(data.creator_earnings_total).toFixed(2)}</p>
          </div>
          <div className={`${pending > 0 ? 'bg-background-accent border-text-accent' : 'bg-background-primary border-border'} border p-4 rounded-xl`}>
             <p className="text-xs text-text-secondary font-medium">Pending Payout</p>
             <p className={`text-2xl font-bold mt-1 ${pending > 0 ? 'text-text-accent' : 'text-text-primary'}`}>
                ₹{pending.toFixed(2)}
             </p>
          </div>
          <div className="bg-background-primary border border-border p-4 rounded-xl">
            <p className="text-xs text-text-secondary font-medium">Paid Out</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">₹{parseFloat(data.total_paid_out).toFixed(2)}</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
           <h4 className="font-semibold text-text-primary mb-3">Recent Transactions</h4>
           <div className="space-y-2">
             {data.recent_transactions?.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4 bg-background-secondary rounded-xl">No transactions yet.</p>
             ) : (
               data.recent_transactions?.map(tx => (
                 <div key={tx.id} className="bg-background-secondary border border-border p-3 rounded-xl flex items-center justify-between">
                   <div>
                     <p className="font-semibold text-text-primary text-sm">@{tx.subscriber}</p>
                     <p className="text-xs text-text-secondary capitalize">{tx.tier} plan • {new Date(tx.date).toLocaleDateString()}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-green-400 font-bold text-sm">+₹{parseFloat(tx.creator_amount).toFixed(2)}</p>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="mx-auto max-w-4xl pb-12">
      <h1 className="mb-8 text-3xl font-bold text-text-primary">Settings</h1>

      <div className="flex flex-col lg:flex-row lg:space-x-8">

        {/* 1. Sidebar Navigation */}
        <div className="w-full lg:w-1/4 mb-6 lg:mb-0">
          <nav className="rounded-xl border border-border bg-background-secondary p-4 space-y-2 sticky top-4">
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'account' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <IoPersonOutline className="h-5 w-5" />
              <span>Account & Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'theme' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <IoColorPaletteOutline className="h-5 w-5" />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'security' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <IoLockClosedOutline className="h-5 w-5" />
              <span>Security</span>
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'archive' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <IoArchiveOutline className="h-5 w-5" />
              <span>Story Archive</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'saved' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <IoBookmarkOutline className="h-5 w-5" />
              <span>Saved Items</span>
            </button>
            <button
              onClick={() => setActiveTab('monetization')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'monetization' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <FaCrown className="h-5 w-5 text-pink-500" />
              <span>Subscriptions</span>
            </button>
            <button
              onClick={() => setActiveTab('creator')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'creator' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <FaCrown className="h-5 w-5 text-yellow-400" />
              <span>Creator Earnings</span>
            </button>

            {/* Logout Button (Always useful) */}
            <hr className="border-border/50 my-2" />
            <Button
              variant="secondary"
              fullWidth
              onClick={logoutUser}
              leftIcon={<IoLogOutOutline className="h-5 w-5 text-red-500" />}
              className="justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              Logout
            </Button>
          </nav>
        </div>

        {/* 2. Main Content Area */}
        <div className="w-full lg:w-3/4">
          <div className="rounded-xl border border-border bg-background-secondary p-6 min-h-[400px]">
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'theme' && <ThemeSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'archive' && <StoryArchive />}
            {activeTab === 'saved' && <SavedItems />}
            {activeTab === 'monetization' && <MonetizationSettings />}
            {activeTab === 'creator' && <CreatorEarningsSettings />}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;