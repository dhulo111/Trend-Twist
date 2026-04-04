// frontend/src/routes/index.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// --- Import Layouts ---
import MainLayout from '../components/layout/MainLayout';
import RequestsPage from '../pages/RequestsPage';
// --- Import Core Protected Page Components ---
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage';
import TrendingPage from '../pages/TrendingPage';
import PostDetailPage from '../pages/PostDetailPage';
import TwistDetailPage from '../pages/TwistDetailPage';
import SettingsPage from '../pages/SettingsPage';
import EditProfilePage from '../pages/EditProfilePage';
import SubscriptionPage from '../pages/SubscriptionPage';

import MessagesPage from '../pages/MessagesPage'; // For Live Chat Inbox
import StrangerTalkPage from '../pages/StrangerTalkPage'; // Talk with Stranger

// --- Import Full-Screen Creation Pages ---
import CreatePostPage from '../pages/CreatePostPage'; // Full page for post creation
import StoryCreatePage from '../pages/StoryCreatePage'; // Full page for story creation
import LiveStreamPage from '../pages/LiveStreamPage'; // NEW: Live Streaming
import SearchPage from '../pages/SearchPage'; // Full page for User Search
import ReelsPage from '../pages/ReelsPage';
import ReelCreatePage from '../pages/ReelCreatePage';
import PaymentSuccessPage from '../pages/PaymentSuccessPage';

// --- Import Unprotected Pages ---
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';
import VisitorPage from '../pages/VisitorPage'; // The new Splash/Landing Page

// --- Import Route Protection ---
import ProtectedRoute from './ProtectedRoute';

import NotificationsPage from '../pages/NotificationsPage';

// --- Import Admin Panel Layout ---
import AdminPanelLayout from '../pages/admin/AdminPanelLayout';
import AdminLogin from '../pages/admin/AdminLogin';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. Unprotected Routes (Login, Register, Landing) */}
      <Route path="/welcome" element={<VisitorPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 2. Protected Routes (Requiring Authentication) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {/* MainLayout renders Navbar/Sidebar */}
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* --- Primary Protected Pages --- */}
        <Route index element={<HomePage />} />
        <Route path="trending" element={<TrendingPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* --- User/Profile Pages --- */}
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="profile/:username/subscribe" element={<SubscriptionPage />} />
        <Route path="success" element={<PaymentSuccessPage />} />
        <Route path="requests" element={<RequestsPage />} />
        {/* Stranger is moved out of MainLayout */}

        {/* --- Content Details --- */}
        <Route path="post/:postId" element={<PostDetailPage />} />
        <Route path="twists/:twistId" element={<TwistDetailPage />} /> {/* NEW */}
        <Route path="edit" element={<EditProfilePage />} />

        {/* --- Reels (Now inside Layout) --- */}
        <Route path="reels" element={<ReelsPage />} />
        <Route path="reels/:reelId" element={<ReelsPage />} />

        {/* ------------------------------------------- */}
        {/* --- Full-Screen Creation/Search Pages (Previously Modals) --- */}
        {/* We place these under the ProtectedRoute, as only logged-in users can access them. */}

        <Route path="create/post" element={<CreatePostPage />} />
        <Route path="create/story" element={<StoryCreatePage />} />
        <Route path="search" element={<SearchPage />} />

      </Route>

      {/* --- Full Screen Create Reel (still standalone or can be in layout, keeping standalone for focus) --- */}
      <Route
        path="/create-reel"
        element={
          <ProtectedRoute>
            <ReelCreatePage />
          </ProtectedRoute>
        }
      />
 
      {/* 4. Full-Screen Stranger Talk (No sidebar/navbar) */}
      <Route
        path="/stranger"
        element={
          <ProtectedRoute>
            <StrangerTalkPage />
          </ProtectedRoute>
        }
      />

      {/* 5. Live Streaming Standalone (No sidebar/navbar) */}
      <Route
        path="/live/:streamId"
        element={
          <ProtectedRoute>
            <LiveStreamPage />
          </ProtectedRoute>
        }
      />

      {/* --- Admin Route (Protected, with nested routes) --- */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<AdminPanelLayout />} />

      {/* --- Blocked User Route --- */}
      <Route path="/blocked" element={<BlockedPage />} />

      {/* 3. Catch-all Route for 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

import BlockedPage from '../pages/BlockedPage';
export default AppRoutes;