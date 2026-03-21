import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaCrown, FaCheckCircle, FaStar, FaGem, FaArrowLeft, FaLock, FaShieldAlt } from 'react-icons/fa';
import { IoArrowForward } from 'react-icons/io5';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const TIER_META = {
  basic: {
    label: 'Basic',
    icon: <FaStar className="text-blue-500 dark:text-blue-400" />,
    gradient: 'from-blue-500/10 to-blue-600/5 dark:from-blue-600/20 dark:to-blue-900/20',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/30',
    glow: 'hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20',
    defaultFeatures: ['Access to exclusive posts', 'Supporter badge on profile', 'Early content access'],
  },
  pro: {
    label: 'Pro',
    icon: <FaCrown className="text-yellow-600 dark:text-yellow-400" />,
    gradient: 'from-yellow-500/10 to-yellow-600/5 dark:from-yellow-600/20 dark:to-yellow-900/20',
    border: 'border-yellow-500/20 dark:border-yellow-500/30',
    badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-400/30',
    glow: 'hover:shadow-yellow-500/10 dark:hover:shadow-yellow-500/20',
    defaultFeatures: ['All Basic perks', 'Exclusive Reels & Stories', 'Priority DMs', 'Pro supporter badge'],
    popular: true,
  },
  elite: {
    label: 'Elite',
    icon: <FaGem className="text-purple-600 dark:text-purple-400" />,
    gradient: 'from-purple-500/10 to-purple-600/5 dark:from-purple-600/20 dark:to-purple-900/20',
    border: 'border-purple-500/20 dark:border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/30',
    glow: 'hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20',
    defaultFeatures: ['All Pro perks', 'Exclusive Twists feed', '1-on-1 shoutouts', 'Elite crown badge', 'Behind-the-scenes content'],
  },
};

const SubscriptionPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null); // plan id being subscribed to
  const [mySubscription, setMySubscription] = useState(null); // current sub to this creator
  const [creatorInfo, setCreatorInfo] = useState(null);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    fetchAll();
  }, [username]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, profileRes] = await Promise.all([
        api.get('/subscriptions/global-plans/'),
        api.get(`/profiles/${username}/`),
      ]);
      setPlans(plansRes.data);
      setCreatorInfo(profileRes.data);

      // Check if current user already subscribed
      if (!isOwnProfile) {
        try {
          const subsRes = await api.get('/subscriptions/me/');
          const existing = subsRes.data.find(s => s.creator_username === username || s.creator === username);
          setMySubscription(existing || null);
        } catch (_) { }
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (isOwnProfile) return;
    setSubscribing(planId);
    try {
      const response = await api.post('/subscriptions/checkout/', { plan_id: planId, creator_username: username });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-text-accent mx-auto mb-4"></div>
        <p className="text-text-secondary text-sm">Loading plans...</p>
      </div>
    </div>
  );

  // Guard: If this creator has not enabled creator mode, show a message
  const isProfileACreator = creatorInfo?.is_creator || creatorInfo?.profile?.is_creator;
  if (!isOwnProfile && creatorInfo && !isProfileACreator) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="w-20 h-20 rounded-full bg-background-secondary border border-border flex items-center justify-center mx-auto mb-5">
            <FaCrown className="text-4xl text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Not a Creator</h2>
          <p className="text-text-secondary text-sm mb-6">
            @{username} has not enabled Creator Mode yet. They cannot accept subscriptions at this time.
          </p>
          <button
            onClick={() => navigate(`/profile/${username}`)}
            className="text-sm text-text-accent hover:underline"
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-text-primary">
      {/* Header */}
      <div className="glass-flat sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/profile/${username}`)}
            className="p-2 bg-background-accent hover:bg-white/10 rounded-full transition-colors"
          >
            <FaArrowLeft className="text-text-primary text-sm" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            {creatorInfo?.profile?.profile_picture && (
              <img
                src={creatorInfo.profile.profile_picture}
                alt={username}
                className="w-10 h-10 rounded-full object-cover border-2 border-text-accent/50"
              />
            )}
            <div>
              <h1 className="font-bold text-text-primary leading-tight">
                Subscribe to <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-accent to-purple-500">@{username}</span>
              </h1>
              <p className="text-xs text-text-secondary">Unlock exclusive creator content</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
            <FaShieldAlt className="text-xs" />
            <span>Secured by Stripe</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Already Subscribed Banner */}
        {mySubscription && (
          <div className="mb-8 card border-green-500/30 bg-green-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-green-500 text-2xl flex-shrink-0" />
              <div>
                <p className="font-bold text-text-primary">You're subscribed! 🎉</p>
                <p className="text-sm text-text-secondary">
                  Current plan: <span className="capitalize font-semibold text-green-500">{mySubscription.tier} Tier</span>
                  {mySubscription.expiry_date && ` · Renews ${new Date(mySubscription.expiry_date).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="bg-green-500 text-white text-sm font-semibold px-6 py-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20 whitespace-nowrap"
            >
              View Content
            </button>
          </div>
        )}

        {/* Own profile redirect */}
        {isOwnProfile && (
          <div className="mb-8 card border-yellow-500/30 bg-yellow-500/5 text-center">
            <p className="text-yellow-500 font-bold mb-2">This is your subscription page</p>
            <p className="text-sm text-text-secondary mb-4">Go to Settings › Creator Mode to manage your plans.</p>
            <button
              onClick={() => navigate('/settings')}
              className="bg-yellow-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all"
            >
              Manage My Plans
            </button>
          </div>
        )}

        {/* No Plans */}
        {plans.length === 0 && !isOwnProfile ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-5">
              <FaCrown className="text-4xl text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Plans Available</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              @{username} hasn't set up subscription plans yet. Check back later!
            </p>
            <button
              onClick={() => navigate(`/profile/${username}`)}
              className="mt-6 text-sm text-pink-400 hover:text-pink-300 transition-colors"
            >
              ← Back to Profile
            </button>
          </div>
        ) : (
          <>
            {/* Plans Grid */}
            <div className={`grid grid-cols-1 ${plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6 mb-10`}>
              {plans.map(plan => {
                const meta = TIER_META[plan.tier] || TIER_META.basic;
                const featureList = plan.features
                  ? plan.features.split(',').map(f => f.trim()).filter(Boolean)
                  : meta.defaultFeatures;
                const isCurrentPlan = mySubscription?.tier === plan.tier;
                const isLoading = subscribing === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl bg-gradient-to-b ${meta.gradient} border ${meta.border} p-6 flex flex-col shadow-xl hover:shadow-2xl ${meta.glow} transition-all duration-300 ${meta.popular ? 'ring-1 ring-yellow-500/50' : ''}`}
                  >
                    {/* Popular badge */}
                    {meta.popular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                        Most Popular
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <FaCheckCircle className="text-xs" /> Active
                      </div>
                    )}

                    {/* Tier header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{meta.icon}</span>
                      <h2 className="text-lg font-black capitalize">{meta.label}</h2>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border w-max mb-5 capitalize ${meta.badge}`}>
                      {plan.tier} tier
                    </span>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-black text-text-primary">₹{parseFloat(plan.price).toFixed(2)}</span>
                      <span className="text-text-secondary text-sm"> / month</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1 mb-7">
                      {featureList.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <FaCheckCircle className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0 text-xs" />
                          <span className="text-sm text-text-secondary leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {!isOwnProfile && (
                      isCurrentPlan ? (
                        <button
                          disabled
                          className="w-full py-3 rounded-xl font-bold text-sm bg-green-500/20 text-green-300 border border-green-500/30 cursor-not-allowed"
                        >
                          ✓ Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={isLoading}
                          className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center gap-2
                            ${isLoading
                               ? 'opacity-60 cursor-wait bg-background-accent'
                               : 'bg-gradient-to-r from-text-accent to-purple-500 hover:from-text-accent hover:to-purple-400 hover:scale-[1.02] active:scale-95 shadow-lg shadow-text-accent/20'
                             }`}
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            <>
                              {mySubscription ? 'Switch to This Plan' : 'Subscribe Now'}
                              <IoArrowForward />
                            </>
                          )}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trust footer */}
            <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5"><FaShieldAlt className="text-green-500" /> Payments secured by Stripe</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><FaLock className="text-blue-400" /> Cancel anytime from your Stripe portal</span>
              <span>•</span>
              <span>Billed monthly</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
