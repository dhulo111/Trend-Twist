import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  Image as ImageIcon,
  MessageSquare,
  Video,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Search,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Ban,
  Award,
  IndianRupee,
  Sun,
  Moon
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminPosts from './AdminPosts';
import AdminReels from './AdminReels';
import AdminTwists from './AdminTwists';
import AdminReports from './AdminReports';
import AdminBlockedUsers from './AdminBlockedUsers';
import AdminSubscriptions from './AdminSubscriptions';
import AdminEarnings from './AdminEarnings';

// Simulated API base (adjust as needed to match your Django config)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AdminPanelLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/admin/login');
          return;
        }

        // Verify `is_staff` by hitting a protected admin endpoint
        await axios.get(`${API_URL}/admin/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setIsAdmin(true);
      } catch (err) {
        console.error("Admin check failed", err);
        navigate('/admin/login'); // redirect to login if not admin or unauthorized
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Reports & Blocks', icon: ShieldAlert, path: '/admin/reports' },
    { name: 'Blocked Users', icon: Ban, path: '/admin/blocks' },
    { name: 'Subscriptions', icon: Award, path: '/admin/subscriptions' },
    { name: 'Revenue & Payouts', icon: IndianRupee, path: '/admin/earnings' },
    { name: 'Users & Profiles', icon: Users, path: '/admin/users' },
    { name: 'Posts & Media', icon: ImageIcon, path: '/admin/posts' },
    { name: 'Twists', icon: MessageSquare, path: '/admin/twists' },
    { name: 'Reels', icon: Video, path: '/admin/reels' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <img src="/logo1.png" alt="TrendTwist Logo" className="h-10 w-10 object-contain drop-shadow-md rounded-xl" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-300 tracking-tight">
                TrendTwist
              </span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                title={!isSidebarOpen ? item.name : ""}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Exit Admin</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-lg font-semibold capitalize">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
            
            <button
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className="p-2 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
               title="Toggle Theme"
            >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                A
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-medium leading-none">Admin User</p>
                <p className="text-xs text-gray-500">Superuser</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="reels" element={<AdminReels />} />
            <Route path="twists" element={<AdminTwists />} />
            <Route path="blocks" element={<AdminBlockedUsers />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="earnings" element={<AdminEarnings />} />
            {/* Add more routes here */}
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPanelLayout;
