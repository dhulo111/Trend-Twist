// frontend/src/pages/VisitorPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaCommentDots, FaUserSecret, FaStar, FaGlobe, FaMoon, FaChartPie, FaPaintBrush } from 'react-icons/fa';

const VisitorPage = () => {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-purple-500/30 overflow-x-hidden">
      
      {/* 1. Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex items-center justify-between bg-gradient-to-b from-bg-primary/90 to-transparent">
        <div className="flex items-center gap-2">
          <img src="/logo1.png" alt="TrendTwist Logo" className="h-10 w-10 object-contain drop-shadow-md rounded-xl" />
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 tracking-tight">
            TrendTwist
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-5 py-2 text-sm font-bold text-text-primary hover:text-purple-400 transition-colors">
            Log In
          </Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full shadow-lg shadow-purple-500/30 transition-transform transform hover:scale-105">
            Join Now
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 pt-20">
        <div 
          className="absolute inset-0 z-0 opacity-40 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/landing_bg.png')" }} 
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-bg-primary/80 to-bg-primary" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">The New Era of Social Media</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-white dark:text-text-primary drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            Connect. Vibe. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-pulse">
              Twist the Trend.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience the ultimate hybrid platform merging explosive short-form Reels, immersive Live Chats, and spontaneous video match-making. No barriers, just pure connection.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 text-base font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-xl shadow-purple-500/30 hover:scale-105 transition-all">
              Start Exploring for Free
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 text-base font-bold bg-bg-secondary border border-border text-text-primary rounded-full hover:bg-bg-accent transition-all">
              Log Into Account
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="relative z-10 py-24 px-6 bg-bg-primary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-black text-text-primary mb-4">Everything in One Place</h2>
             <p className="text-text-secondary max-w-xl mx-auto">Why switch apps? We built the ultimate social ecosystem designed entirely around meaningful engagement and viral reach.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* Feature 1 */}
             <div className="bg-bg-secondary border border-border rounded-3xl p-8 hover:-translate-y-2 hover:border-purple-500/40 transition-all duration-300 shadow-xl shadow-black/5">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
                 <FaPlay className="text-white text-xl" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-3">Vibely Reels</h3>
               <p className="text-sm text-text-secondary leading-relaxed">Swipe through endless, algorithm-optimized short-form videos. Create, edit, and share high-quality moments.</p>
             </div>
             
             {/* Feature 2 */}
             <div className="bg-bg-secondary border border-border rounded-3xl p-8 hover:-translate-y-2 hover:border-blue-500/40 transition-all duration-300 shadow-xl shadow-black/5">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                 <FaCommentDots className="text-white text-xl" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-3">Twists & Chat</h3>
               <p className="text-sm text-text-secondary leading-relaxed">Engage in rapid-fire text messaging, encrypted DMs, and public "Twists" that keep the timeline constantly alive.</p>
             </div>

             {/* Feature 3 */}
             <div className="bg-bg-secondary border border-border rounded-3xl p-8 hover:-translate-y-2 hover:border-purple-500/40 transition-all duration-300 shadow-xl shadow-black/5">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                 <FaUserSecret className="text-white text-xl" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-3">Talk With Strangers</h3>
               <p className="text-sm text-text-secondary leading-relaxed">Break the ice instantly. Our secure, randomized WebRTC matchmaking lets you meet fascinating people worldwide via video/audio.</p>
             </div>

             {/* Feature 4 */}
             <div className="bg-bg-secondary border border-border rounded-3xl p-8 hover:-translate-y-2 hover:border-yellow-500/40 transition-all duration-300 shadow-xl shadow-black/5">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20">
                 <FaStar className="text-white text-xl" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-3">Creator Monetization</h3>
               <p className="text-sm text-text-secondary leading-relaxed">Turn your influence into income. Activate Creator Mode, set exclusive subscription tiers, and earn 80% on all memberships.</p>
             </div>

             {/* Feature 5 */}
             <div className="bg-bg-secondary border border-border/50 rounded-3xl p-8 hover:-translate-y-2 hover:border-orange-500/40 transition-all duration-300 shadow-xl shadow-black/5">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                 <FaChartPie className="text-white text-xl" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-3">Immersive Analytics</h3>
               <p className="text-sm text-text-secondary leading-relaxed">Creators get transparent, detailed real-time analytics. Track impressions, revenue, and active subscriber stats instantly.</p>
             </div>

             {/* Feature 6 */}
             <div className="bg-bg-secondary border border-border/50 rounded-3xl p-8 hover:-translate-y-2 hover:border-gray-500/40 transition-all duration-300 shadow-xl shadow-black/5">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mb-6 shadow-lg shadow-gray-500/20">
                 <FaMoon className="text-white text-xl" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-3">True Dark Mode</h3>
               <p className="text-sm text-text-secondary leading-relaxed">A perfectly crafted, eye-strain-free toggleable Dark Mode mapping the entire site interface flawlessly across all devices.</p>
             </div>

             {/* Feature 7 - Large ColSpan */}
             <div className="bg-bg-secondary border border-border/50 rounded-3xl p-8 hover:-translate-y-2 hover:border-emerald-500/40 transition-all duration-300 shadow-xl shadow-black/5 md:col-span-2 lg:col-span-3 lg:flex lg:items-center lg:gap-10">
               <div className="flex-shrink-0 w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-6 lg:mb-0 shadow-lg shadow-emerald-500/20">
                 <FaGlobe className="text-white text-3xl" />
               </div>
               <div>
                  <h3 className="text-2xl font-bold text-text-primary mb-3">Global Community. Absolute Privacy.</h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-4xl">Connect securely across the globe. We prioritize organic reach, robust privacy protections, and active account moderation. Set your profile to private, manage follower requests, and take total control over who sees your activity. A sophisticated infrastructure ensures a smooth, uninterrupted platform scale with zero downtime.</p>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* 4. T&C / Info Footer Section */}
      <footer className="bg-bg-primary pt-16 pb-8 px-6">
         <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
               <div className="flex items-center gap-2 mb-4">
                  <img src="/logo1.png" alt="TrendTwist Logo" className="h-8 w-8 object-contain rounded-lg border border-border/50 bg-white/5" />
                  <span className="text-lg font-black text-text-primary tracking-tight">TrendTwist</span>
               </div>
               <p className="text-sm text-text-secondary max-w-sm">
                  Empowering creators and redefining digital connection. TrendTwist is your ultimate destination for networking, short-form media, and authentic communication.
               </p>
            </div>
            
            <div>
               <h4 className="font-bold text-text-primary mb-4">Platform</h4>
               <ul className="space-y-2 text-sm text-text-secondary">
                  <li><Link to="/login" className="hover:text-purple-400 transition-colors">Log In</Link></li>
                  <li><Link to="/register" className="hover:text-purple-400 transition-colors">Create Account</Link></li>
                  <li><span className="cursor-pointer hover:text-purple-400 transition-colors">Download App</span></li>
               </ul>
            </div>

            <div>
               <h4 className="font-bold text-text-primary mb-4">Legal</h4>
               <ul className="space-y-2 text-sm text-text-secondary">
                  <li><span className="cursor-pointer hover:text-purple-400 transition-colors">Terms of Service</span></li>
                  <li><span className="cursor-pointer hover:text-purple-400 transition-colors">Privacy Policy</span></li>
                  <li><span className="cursor-pointer hover:text-purple-400 transition-colors">Creator Guidelines</span></li>
                  <li><span className="cursor-pointer hover:text-purple-400 transition-colors">Cookie Policy</span></li>
               </ul>
            </div>
         </div>
         
         <div className="max-w-6xl mx-auto pt-8 border-t border-border/20 text-center flex flex-col md:flex-row items-center justify-between">
            <p className="text-xs text-text-secondary">
               &copy; {new Date().getFullYear()} TrendTwist Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0 opacity-50">
               <p className="text-xs text-text-secondary font-bold">Designed for the Future.</p>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default VisitorPage;
