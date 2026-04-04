// frontend/src/pages/SettingsPage.jsx

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import { 
  IoLogOutOutline, IoColorPaletteOutline, IoPersonOutline, IoLockClosedOutline, 
  IoArchiveOutline, IoBookmarkOutline, IoCheckmarkCircle, IoCloseCircle, IoSparkles,
  IoWalletOutline, IoInformationCircleOutline, IoCashOutline, IoRefreshOutline
} from 'react-icons/io5';

import { FaCrown, FaStar, FaRocket, FaShieldAlt, FaHandshake, FaMoneyBillWave } from 'react-icons/fa';
import api from '../api/axiosInstance';
import StoryArchive from '../components/features/feed/StoryArchive';
import SavedItems from '../components/features/profile/SavedItems';

const SettingsPage = () => {
  const { user, logoutUser, refreshUserProfile } = useContext(AuthContext);
  const { theme, ThemeToggle } = useContext(ThemeContext);

  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Placeholder for account deletion logic (requires backend)
  const [isDeleting, setIsDeleting] = useState(false);

  const isCreator = user?.is_creator || user?.profile?.is_creator || false;

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
          onClick={async () => {
            if (window.confirm('Are you absolutely sure you want to delete your account? All your data will be permanently wiped.')) {
              setIsDeleting(true);
              try {
                await api.delete('/auth/delete-account/');
                logoutUser();
              } catch (err) {
                console.error("Account deletion failed:", err);
                alert(err.response?.data?.error || 'Failed to delete account. Please try again.');
              } finally {
                setIsDeleting(false);
              }
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

      <Button variant="secondary" disabled={true}>
        Change Email/Password (Not implemented)
      </Button>
    </div>
  );

  const CreatorModeSettings = () => {
    const [toggling, setToggling] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showConfirmDisable, setShowConfirmDisable] = useState(false);

    const handleEnableCreator = async () => {
      if (!termsAccepted) {
        alert('Please accept the Terms & Conditions to become a creator.');
        return;
      }
      setToggling(true);
      try {
        await api.patch('/profile/creator-mode/', { is_creator: true });
        await refreshUserProfile();
      } catch (e) {
        console.error('Failed to enable creator mode:', e);
        alert('Something went wrong. Please try again.');
      } finally {
        setToggling(false);
      }
    };

    const handleDisableCreator = async () => {
      setToggling(true);
      try {
        await api.patch('/profile/creator-mode/', { is_creator: false });
        await refreshUserProfile();
        setShowConfirmDisable(false);
      } catch (e) {
        console.error('Failed to disable creator mode:', e);
        alert('Something went wrong. Please try again.');
      } finally {
        setToggling(false);
      }
    };

    const benefits = [
      { icon: <FaMoneyBillWave className="text-green-400" />, title: 'Earn from Subscriptions', desc: 'Get 80% of every subscription payment from your fans.' },
      { icon: <FaStar className="text-yellow-400" />, title: 'Exclusive Content', desc: 'Lock posts, reels, and twists behind subscription tiers.' },
      { icon: <FaRocket className="text-blue-400" />, title: 'Creator Analytics', desc: 'View earnings, subscriber counts, and payout history.' },
      { icon: <FaShieldAlt className="text-purple-400" />, title: 'Premium Profile Badge', desc: 'Stand out with Subscribers count visible on your profile.' },
    ];

    const terms = [
      'You must be 18 years or older to become a creator and earn on TrendTwist.',
      'TrendTwist takes a 20% platform fee on all subscription earnings. You receive 80%.',
      'Payouts are processed by admins and transferred to your linked account upon request.',
      'You are responsible for ensuring your exclusive content complies with our Community Guidelines.',
      'Engaging in fraud, spam, or impersonation will result in immediate creator status revocation.',
      'TrendTwist reserves the right to modify the creator program terms at any time with prior notice.',
      'You can disable creator mode at any time, but active subscriptions will be honoured until expiry.',
      'By enabling Creator Mode, you agree to all of the above terms and our general Terms of Service.',
    ];

    // Already a creator — show current status + disable option
    if (isCreator) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Active Creator Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent p-6">
            <div className="absolute -top-8 -right-8 text-yellow-500/10 text-[120px]">
              <FaCrown />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center">
                <FaCrown className="text-yellow-400 text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  Creator Mode Active
                  <IoCheckmarkCircle className="text-green-400 text-xl" />
                </h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  You are a verified TrendTwist Creator. All creator features are enabled on your profile.
                </p>
              </div>
            </div>
          </div>

          {/* Active Feature Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background-primary">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background-secondary flex items-center justify-center text-lg">
                  {b.icon}
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{b.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Disable Creator Mode */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-400">Disable Creator Mode</p>
            <p className="text-xs text-text-secondary">
              Disabling creator mode will hide the Subscribe button and all creator features from your profile. 
              Active subscriber subscriptions will still be honoured until they expire.
            </p>
            {!showConfirmDisable ? (
              <Button variant="danger" onClick={() => setShowConfirmDisable(true)}>
                Disable Creator Mode
              </Button>
            ) : (
              <div className="flex items-center gap-3 pt-1">
                <p className="text-sm font-semibold text-red-400 flex-1">Are you sure?</p>
                <Button variant="secondary" onClick={() => setShowConfirmDisable(false)} disabled={toggling}>Cancel</Button>
                <Button variant="danger" onClick={handleDisableCreator} disabled={toggling}>
                  {toggling ? <Spinner size="sm" /> : 'Yes, Disable'}
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Not yet a creator — show opt-in page
    return (
      <div className="space-y-6 animate-in fade-in duration-500">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-transparent border border-purple-500/20 p-6 text-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
              <FaCrown className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Become a Creator</h3>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              Unlock the ability to monetize your content, accept subscriptions, and earn directly from your biggest fans.
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div>
          <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <IoSparkles className="text-yellow-400" /> What you unlock as a Creator
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background-secondary hover:border-purple-500/30 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center text-lg">
                  {b.icon}
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{b.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How Earnings Work */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-2">
          <h4 className="font-bold text-green-400 flex items-center gap-2 mb-3">
            <FaHandshake /> How Earnings Work
          </h4>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-3xl font-black text-text-primary">₹</p>
              <p className="text-xs text-text-secondary">Fan pays</p>
            </div>
            <div className="text-text-secondary text-xl">→</div>
            <div>
              <p className="text-3xl font-black text-green-400">80%</p>
              <p className="text-xs text-text-secondary">You earn</p>
            </div>
            <div className="text-text-secondary text-xl">+</div>
            <div>
              <p className="text-3xl font-black text-text-secondary">20%</p>
              <p className="text-xs text-text-secondary">Platform fee</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary text-center pt-1">
            Payouts are processed by our admin team and transferred to your linked account.
          </p>
        </div>

        {/* Terms & Conditions */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-3">
          <h4 className="font-bold text-yellow-400 flex items-center gap-2">
            <FaShieldAlt /> Creator Terms & Conditions
          </h4>
          <p className="text-xs text-text-secondary">Please read and accept these terms before becoming a creator.</p>
          <ul className="space-y-2">
            {terms.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                {term}
              </li>
            ))}
          </ul>
        </div>

        {/* Accept & Enable */}
        <div className="rounded-xl border border-border bg-background-secondary p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="sr-only"
                id="creator-terms-checkbox"
              />
              <div
                onClick={() => setTermsAccepted(v => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                  termsAccepted
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-border bg-transparent group-hover:border-purple-400'
                }`}
              >
                {termsAccepted && <IoCheckmarkCircle className="text-white text-xs" />}
              </div>
            </div>
            <span className="text-sm text-text-secondary leading-relaxed">
              I have read and agree to the <span className="text-text-accent font-semibold">Creator Terms & Conditions</span> above. I understand that TrendTwist takes a 20% platform fee and payouts are managed by the admin.
            </span>
          </label>

          <Button
            variant="primary"
            fullWidth
            onClick={handleEnableCreator}
            disabled={!termsAccepted || toggling}
            className={`py-3 text-base font-bold transition-all ${
              termsAccepted
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/30 border-none text-white'
                : 'opacity-50 cursor-not-allowed'
            }`}
            leftIcon={!toggling && <FaCrown className="mr-1" />}
          >
            {toggling ? <Spinner size="sm" /> : 'Enable Creator Mode'}
          </Button>

          <p className="text-xs text-text-secondary text-center">
            You can disable Creator Mode at any time from this settings page.
          </p>
        </div>
      </div>
    );
  };

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
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState(false);
    
    // Withdrawal Details Form State
    const [editingInfo, setEditingInfo] = useState(false);
    const [info, setInfo] = useState({
      method: 'bank',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      holderName: '',
      upiId: ''
    });

    // Withdrawal Amount
    const [amount, setAmount] = useState('');

    const fetchData = async () => {
      try {
        const [eRes, hRes] = await Promise.all([
          api.get('/creators/me/earnings/'),
          api.get('/withdrawals/')
        ]);
        setData(eRes.data);
        setHistory(hRes.data);
        
        // Initialize info from data
        if (eRes.data.withdrawal_info) {
          setInfo(prev => ({ ...prev, ...eRes.data.withdrawal_info }));
        }
      } catch (e) {
        console.error('Failed to load earnings or history:', e);
      } finally {
        setLoading(false);
      }
    };

    React.useEffect(() => {
      fetchData();
    }, []);

    const handleSaveInfo = async () => {
      setLoading(true);
      try {
        await api.patch('/profile/update/', { withdrawal_info: info });
        await refreshUserProfile();
        setEditingInfo(false);
        alert('Withdrawal information updated successfully.');
      } catch (e) {
        alert('Failed to update information.');
      } finally {
        setLoading(false);
      }
    };

    const handleWithdraw = async () => {
      const val = parseFloat(amount);
      if (isNaN(val) || val < 100) {
        alert('Minimum withdrawal is ₹100.');
        return;
      }
      if (val > parseFloat(data.available_balance)) {
        alert('Insufficient balance.');
        return;
      }

      setWithdrawing(true);
      try {
        await api.post('/withdrawals/', { amount: val, payment_method: info.method });
        setAmount('');
        await fetchData();
        alert('Withdrawal request submitted! It will be processed soon.');
      } catch (e) {
        alert(e.response?.data?.error || 'Failed to submit withdrawal request.');
      } finally {
        setWithdrawing(false);
      }
    };

    if (loading && !data) return <div className="flex justify-center py-8"><Spinner /></div>;

    if (!data) return (
      <div className="text-center py-8 text-text-secondary">
        Could not load your earnings data at this time.
      </div>
    );

    const balance = parseFloat(data.available_balance);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <IoWalletOutline className="text-yellow-400" /> Creator Wallet
          </h3>
          <p className="text-sm text-text-secondary mt-1">Manage your earnings, update payout details, and initiate withdrawals.</p>
        </div>

        {/* Balance Overview Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent border border-green-500/30 p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <IoCashOutline size={120} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">Available for Withdrawal</p>
              <h4 className="text-4xl font-black text-text-primary">₹{balance.toFixed(2)}</h4>
              <p className="text-xs text-text-secondary mt-2">
                Total Earned: ₹{parseFloat(data.creator_earnings_total).toFixed(2)} (Net of 20% platform fee)
              </p>
            </div>
            
            <div className="flex flex-col justify-center space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 !mb-0"
                />
                <Button 
                  variant="primary" 
                  onClick={handleWithdraw}
                  disabled={withdrawing || balance < 100 || !amount}
                  className="bg-green-500 hover:bg-green-600 border-none text-white font-bold px-6"
                >
                  {withdrawing ? <Spinner size="sm" /> : 'Withdraw'}
                </Button>
              </div>
              <p className="text-[10px] text-text-secondary">
                Min. Withdrawal: ₹100.00 • Instant balance lock on request.
              </p>
            </div>
          </div>
        </div>

        {/* Withdrawal Information */}
        <div className="rounded-xl border border-border bg-background-secondary p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-text-primary flex items-center gap-2">
              <IoInformationCircleOutline className="text-blue-400" /> Withdrawal Details
            </h4>
            <Button variant="secondary" size="sm" onClick={() => setEditingInfo(!editingInfo)}>
              {editingInfo ? 'Cancel' : 'Update Details'}
            </Button>
          </div>

          {!editingInfo ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background-primary border border-border">
                <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Method</p>
                <p className="text-sm font-medium text-text-primary capitalize">{info.method || 'Not set'}</p>
              </div>
              {info.method === 'bank' ? (
                <>
                  <div className="p-3 rounded-lg bg-background-primary border border-border">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Bank Name</p>
                    <p className="text-sm font-medium text-text-primary">{info.bankName || '-'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background-primary border border-border">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Account Number</p>
                    <p className="text-sm font-medium text-text-primary">{info.accountNumber ? `****${info.accountNumber.slice(-4)}` : '-'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background-primary border border-border">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">IFSC Code</p>
                    <p className="text-sm font-medium text-text-primary text-blue-400">{info.ifsc || '-'}</p>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-lg bg-background-primary border border-border">
                  <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">UPI ID</p>
                  <p className="text-sm font-medium text-text-primary">{info.upiId || '-'}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setInfo({...info, method: 'bank'})}
                  className={`p-3 rounded-lg border text-sm font-bold transition-all ${info.method === 'bank' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-border bg-background-primary text-text-secondary'}`}
                >
                  Bank Transfer
                </button>
                <button 
                  onClick={() => setInfo({...info, method: 'upi'})}
                  className={`p-3 rounded-lg border text-sm font-bold transition-all ${info.method === 'upi' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-border bg-background-primary text-text-secondary'}`}
                >
                  UPI ID
                </button>
              </div>

              {info.method === 'bank' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Bank Name" value={info.bankName} onChange={e => setInfo({...info, bankName: e.target.value})} placeholder="e.g. HDFC Bank" />
                  <Input label="Account Holder Name" value={info.holderName} onChange={e => setInfo({...info, holderName: e.target.value})} placeholder="Full Name" />
                  <Input label="Account Number" value={info.accountNumber} onChange={e => setInfo({...info, accountNumber: e.target.value})} placeholder="Account No." />
                  <Input label="IFSC Code" value={info.ifsc} onChange={e => setInfo({...info, ifsc: e.target.value})} placeholder="IFSC" />
                </div>
              ) : (
                <Input label="UPI ID" value={info.upiId} onChange={e => setInfo({...info, upiId: e.target.value})} placeholder="username@upi" />
              )}
              
              <Button variant="primary" onClick={handleSaveInfo} fullWidth>
                Save Withdrawal Details
              </Button>
            </div>
          )}
        </div>

        {/* Terms & Conditions Accordion-style */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs space-y-2">
          <p className="font-bold text-yellow-500 flex items-center gap-1 uppercase tracking-tighter">
            <FaShieldAlt /> Creator Withdrawal Terms
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-4 text-text-secondary">
            <li>Processing takes 3-5 business days.</li>
            <li>Min. withdrawal: ₹100.00.</li>
            <li>Net earnings (80%) are shown as balance.</li>
            <li>Verification may be required for large amounts.</li>
            <li>Incorrect info may lead to lost funds.</li>
            <li>Taxes are creator's responsibility.</li>
          </ul>
        </div>

        {/* Tabs for History */}
        <div className="space-y-4">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <IoRefreshOutline className="text-purple-400" /> Transaction History
          </h4>
          
          <div className="space-y-2">
             {history.length === 0 && data.recent_transactions.length === 0 ? (
               <div className="text-center py-10 bg-background-secondary rounded-xl border border-border text-text-secondary italic text-sm">
                 No transaction activity yet.
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="text-xs text-text-secondary uppercase bg-background-primary border-b border-border">
                     <tr>
                       <th className="px-4 py-3">Type</th>
                       <th className="px-4 py-3">Amount</th>
                       <th className="px-4 py-3">Status</th>
                       <th className="px-4 py-3">Date</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border/50">
                      {history.map(w => (
                        <tr key={`w-${w.id}`} className="hover:bg-background-secondary/50">
                          <td className="px-4 py-3 font-medium text-red-400 flex items-center gap-2">
                            <IoCashOutline /> Withdrawal
                          </td>
                          <td className="px-4 py-3 font-bold text-text-primary">-₹{parseFloat(w.amount).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                               w.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                               w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                               'bg-red-500/20 text-red-400'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary">{new Date(w.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {data.recent_transactions.map(t => (
                        <tr key={`t-${t.id}`} className="hover:bg-background-secondary/50">
                          <td className="px-4 py-3 font-medium text-green-400 flex items-center gap-2">
                            <FaStar /> Subscription
                          </td>
                          <td className="px-4 py-3 font-bold text-text-primary">+₹{parseFloat(t.creator_amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-text-secondary italic">Credited</td>
                          <td className="px-4 py-3 text-xs text-text-secondary">{new Date(t.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
               </div>
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

            {/* Creator Mode Tab — always visible so users can toggle */}
            <button
              onClick={() => setActiveTab('creator-mode')}
              className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                ${activeTab === 'creator-mode' 
                  ? 'bg-background-accent text-text-accent font-semibold' 
                  : 'text-text-primary hover:bg-background-accent/50'}`}
            >
              <div className="relative">
                <FaCrown className="h-5 w-5 text-purple-400" />
                {isCreator && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-background-secondary" />
                )}
              </div>
              <span>Creator Mode</span>
              {isCreator && (
                <span className="ml-auto text-[10px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">ON</span>
              )}
            </button>

            {/* Creator Earnings — only show if user IS a creator */}
            {isCreator && (
              <button
                onClick={() => setActiveTab('creator')}
                className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors 
                  ${activeTab === 'creator' ? 'bg-background-accent text-text-accent font-semibold' : 'text-text-primary hover:bg-background-accent/50'}`}
              >
                <FaCrown className="h-5 w-5 text-yellow-400" />
                <span>Creator Earnings</span>
              </button>
            )}

            {/* Logout Button */}
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
            {activeTab === 'creator-mode' && <CreatorModeSettings />}
            {activeTab === 'creator' && isCreator && <CreatorEarningsSettings />}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;