// frontend/src/pages/SettingsPage.jsx

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import { IoLogOutOutline, IoColorPaletteOutline, IoPersonOutline, IoLockClosedOutline } from 'react-icons/io5';

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
          <div className="rounded-xl border border-border bg-background-secondary p-6">
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'theme' && <ThemeSettings />}
            {activeTab === 'security' && <SecuritySettings />}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;