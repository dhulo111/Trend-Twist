import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import Avatar from '../common/Avatar';
import Tooltip from '../common/Tooltip';
import Button from '../common/Button';

// --- Icons --- //
import {
  IoHomeOutline,
  IoHomeSharp,
  IoSettingsOutline,
  IoLogOutOutline,
  IoCreateOutline,
  IoChatbubbleEllipsesOutline,
  IoChatbubbleEllipsesSharp,
  IoSearchOutline,
  IoFilmOutline,
  IoFilmSharp,
  IoAddCircleOutline,
  IoHeartOutline,
  IoHeart
} from 'react-icons/io5';
import { MdTrendingUp } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';

const Navbar = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const { theme, ThemeToggle } = useContext(ThemeContext);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();

  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Profile Dropdown Menu (Desktop Only usually) ---
  const ProfileDropdown = () => (
    <div
      ref={dropdownRef}
      className="absolute bottom-full mb-3 w-60 left-0
                 rounded-2xl glass border-glass-border
                 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="p-2 space-y-1">
        <Link
          to={`/profile/${user?.username}`}
          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-text-primary hover:bg-white/10 transition-colors"
          onClick={() => setIsProfileMenuOpen(false)}
        >
          <FaUserCircle className="h-5 w-5 text-text-accent" />
          <span>View Profile</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-text-primary hover:bg-white/10 transition-colors"
          onClick={() => setIsProfileMenuOpen(false)}
        >
          <IoSettingsOutline className="h-5 w-5 text-text-secondary" />
          <span>Settings</span>
        </Link>
        <div className="my-1 border-t border-white/10"></div>
        <button
          onClick={logoutUser}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <IoLogOutOutline className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* =================================================================================
          DESKTOP SIDEBAR (Visible md+)
          ================================================================================= */}
      <nav
        className="hidden md:flex flex-col justify-between fixed left-0 top-0 h-full w-64 z-40 
                   glass bg-glass-bg border-r border-glass-border px-4 py-6 transition-all"
      >
        {/* --- Top Section --- */}
        <div>
          {/* Logo */}
          <Link
            to="/"
            className="mb-10 flex items-center space-x-3 px-3 group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-text-accent to-purple-400 text-white font-bold text-xl shadow-lg transition-transform group-hover:rotate-6">
              TT
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
              TrendTwist
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex flex-col space-y-2">
            {[
              { to: '/', icon: IoHomeOutline, activeIcon: IoHomeSharp, label: 'Home' },
              { to: '/trending', icon: MdTrendingUp, activeIcon: MdTrendingUp, label: 'Trending' },
              { to: '/search', icon: IoSearchOutline, activeIcon: IoSearchOutline, label: 'Search' },
              { to: '/reels', icon: IoFilmOutline, activeIcon: IoFilmSharp, label: 'Reels' },
              { to: '/messages', icon: IoChatbubbleEllipsesOutline, activeIcon: IoChatbubbleEllipsesSharp, label: 'Messages' },
              { to: '/notifications', icon: IoHeartOutline, activeIcon: IoHeart, label: 'Notifications' },
            ].map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                children={({ isActive }) => (
                  <div
                    className={`
                      flex w-full items-center space-x-4 rounded-xl px-4 py-3
                      transition-all duration-300 group
                      ${isActive
                        ? 'bg-text-accent/10 text-text-accent font-semibold shadow-inner'
                        : 'text-text-secondary hover:bg-white/10 hover:text-text-primary hover:shadow-sm'}
                    `}
                  >
                    <span className={`text-2xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                      {isActive ? <item.activeIcon /> : <item.icon />}
                    </span>
                    <span className="text-base font-medium tracking-wide">{item.label}</span>
                  </div>
                )}
              />
            ))}

            {/* Create Button (Desktop) */}
            <Link to="/create/post">
              <Button
                fullWidth
                className="mt-6 bg-gradient-to-r from-text-accent to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                leftIcon={<IoCreateOutline className="h-6 w-6" />}
              >
                Create Post
              </Button>
            </Link>
          </div>
        </div>

        {/* --- Bottom Section (Desktop) --- */}
        <div className="flex flex-col space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center space-x-3 rounded-xl px-4 py-3 text-text-secondary transition-colors hover:bg-white/10 cursor-pointer">
            <ThemeToggle />
            <span className="text-base font-medium">Appearance</span>
          </div>

          {/* Profile User Menu */}
          <div className="relative" ref={profileMenuRef}>
            {isProfileMenuOpen && <ProfileDropdown />}
            <div
              className={`
                flex cursor-pointer items-center space-x-3 rounded-xl p-3 
                transition-all border border-transparent
                ${isProfileMenuOpen ? 'bg-white/10 border-white/20 shadow-inner' : 'hover:bg-white/10 hover:border-white/10'}
              `}
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            >
              <Avatar src={user?.profile?.profile_picture} size="sm" className="ring-2 ring-white/50" />
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-text-primary truncate font-sm leading-tight">{user?.username}</span>
                <span className="text-xs text-text-secondary">View Profile</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* =================================================================================
          MOBILE TOP BAR (Visible < md)
          ================================================================================= */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-glass-bg glass border-b border-glass-border z-40 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-tr from-text-accent to-purple-400 text-white font-bold text-sm shadow-lg">
            TT
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
            TrendTwist
          </span>
        </Link>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link to="/notifications">
            <IoHeartOutline className="text-text-primary text-2xl" />
          </Link>
          <Link to="/messages">
            <IoChatbubbleEllipsesOutline className="text-text-primary text-2xl" />
          </Link>
        </div>
      </div>

      {/* =================================================================================
          MOBILE BOTTOM BAR (Visible < md)
          ================================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16
                   glass bg-glass-bg border-t border-glass-border
                   flex items-center justify-around px-2 pb-safe"
      >
        {/* 1. Home */}
        <NavLink to="/" className={({ isActive }) => `p-2 rounded-full transition-all duration-200 ${isActive ? 'text-text-accent scale-110' : 'text-text-secondary'}`}>
          {({ isActive }) => (isActive ? <IoHomeSharp size={26} /> : <IoHomeOutline size={26} />)}
        </NavLink>

        {/* 2. Search (Trend Twist usually emphasizes Trending/Search) */}
        <NavLink to="/trending" className={({ isActive }) => `p-2 rounded-full transition-all duration-200 ${isActive ? 'text-text-accent scale-110' : 'text-text-secondary'}`}>
          {({ isActive }) => (isActive ? <MdTrendingUp size={28} /> : <MdTrendingUp size={28} className="opacity-70" />)}
        </NavLink>

        {/* 3. Create (Center Floating Button) */}
        <div className="relative -top-3">
          <Link to="/create/post">
            <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-text-accent to-purple-400 flex items-center justify-center text-white  border-4 border-white dark:border-[#1a1a1a]">
              <IoAddCircleOutline size={32} />
            </div>
          </Link>
        </div>

        {/* 4. Reels */}
        <NavLink to="/reels" className={({ isActive }) => `p-2 rounded-full transition-all duration-200 ${isActive ? 'text-text-accent scale-110' : 'text-text-secondary'}`}>
          {({ isActive }) => (isActive ? <IoFilmSharp size={26} /> : <IoFilmOutline size={26} />)}
        </NavLink>

        {/* 5. Profile */}
        <NavLink to={`/profile/${user?.username}`} className={({ isActive }) => `p-1 rounded-full w-10 border-2 transition-all duration-200 ${isActive ? 'border-text-accent' : 'border-transparent'}`}>
          <Avatar src={user?.profile?.profile_picture} size="xs" />
        </NavLink>
      </nav>
    </>
  );
};

export default Navbar;
