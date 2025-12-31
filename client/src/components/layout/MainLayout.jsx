// frontend/src/components/layout/MainLayout.jsx

import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const MainLayout = () => {
  const location = useLocation();
  const isFixedPage = location.pathname.startsWith('/reels') || location.pathname.startsWith('/messages');

  // Apply the saved theme on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="flex min-h-screen bg-transparent text-text-primary font-sans selection:bg-text-accent selection:text-white">
      {/* 1. Navigation Bar (Responsive: Sidebar on Desktop, Bottom Bar on Mobile) */}
      <Navbar />

      {/* 2. Main Content Area */}
      <main
        className={`flex-1 w-full h-screen md:pl-64 pb-16 pt-16 md:pt-0 md:pb-0 transition-all duration-300 ${isFixedPage ? 'overflow-hidden' : 'overflow-y-auto scroll-smooth'
          }`}
      >
        <div className={`w-full ${isFixedPage ? 'h-full' : 'min-h-full'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;