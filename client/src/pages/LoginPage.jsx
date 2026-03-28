// frontend/src/pages/LoginPage.jsx

import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icon Imports from react-icons ---
import { IoMdTrendingUp } from 'react-icons/io';
import { BsMoonStarsFill, BsSunFill } from 'react-icons/bs';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// --- Animation Variants ---
const formVariants = {
  hidden: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.3 } },
};

const LoginPage = () => {
  // --- States and Context ---
  const [step, setStep] = useState(1);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blockInfo, setBlockInfo] = useState(null);

  const { checkUserExists, loginWithPassword, googleLogin } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  // --- Handlers ---
  const handleUserCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBlockInfo(null);
    try {
      const response = await checkUserExists(usernameOrEmail);
      if (response.exists) {
        setStep(2);
      } else {
        setError("User not found. Please register first.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to check user. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithPassword(usernameOrEmail, password);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'Account Blocked') {
        setBlockInfo(err.response.data);
      } else {
        const errorMsg = err.response?.data?.error || 'Login failed. Please check your password.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const googleToken = credentialResponse.credential;
    setLoading(true);
    setError(null);
    setBlockInfo(null);
    try {
      await googleLogin(googleToken);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'Account Blocked') {
        setBlockInfo(err.response.data);
      } else {
        setError('Google Login Failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    setError('Google Login service failed. Please try again later.');
  };


  return (
    <div className="relative flex min-h-screen w-full bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">

      {/* --- Theme Toggle Button --- */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-10 rounded-full p-2.5 
                   bg-background-secondary/70 border border-border/50
                   text-text-secondary transition-colors hover:text-text-accent"
      >
        {theme === 'light' ? <BsMoonStarsFill /> : <BsSunFill />}
      </button>

      {/* --- 1. Left Column (Image/Branding) --- */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 items-center justify-center p-12">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-5xl font-extrabold text-text-primary">
            Trend<span className="text-text-accent">Twist</span>
          </h1>
          <p className="mt-4 max-w-md text-2xl text-text-secondary">
            Discover what's new. Join the next trend.
          </p>
          <img
            src="https://gosharpener.com/content/uploads/photos/2024/09/sngine_554b7fb4220580094ff96ca152962eb8.jpg"
            alt="Login Graphic"
            className="mt-12 w-full max-w-lg rounded-2xl shadow-2xl"
          />
        </div>
      </div>

      {/* --- 2. Right Column (Login Form) --- */}
      <div className="flex w-full items-center justify-center p-4 md:w-1/2 lg:w-2/5">

        {/* Glassmorphism Panel */}
        <div className="w-full max-w-md overflow-hidden rounded-2xl 
                        border border-border/50 bg-background-secondary/70 
                        p-8 shadow-2xl backdrop-blur-lg">

          {/* --- Header --- */}
          <div className="flex flex-col items-center text-center">
            <IoMdTrendingUp className="h-10 w-10 text-text-accent" />
            <h1 className="mt-4 text-3xl font-bold text-text-primary">
              {step === 1 ? 'Welcome Back' : 'Enter Password'}
            </h1>
            <p className="mt-2 text-text-secondary">
              {step === 1
                ? 'Enter your username or email to continue.'
                : `Enter password for ${usernameOrEmail}`}
            </p>
          </div>

          {/* --- Error Display --- */}
          {error && !blockInfo && (
            <p className="mt-4 rounded-md bg-red-500/10 p-3 text-center text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          {/* --- Block Info Display --- */}
          {blockInfo && (
            <div className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-center">
              <h3 className="text-lg font-bold text-red-500 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">Account Blocked</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Your account has been temporarily restricted for violating our community guidelines.
              </p>
              <div className="flex flex-col gap-2 p-3 bg-red-500/5 dark:bg-black/20 rounded-lg text-sm font-medium text-text-primary mb-4 text-left">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-red-500/70 mb-0.5">Reason</span>
                  <span>{blockInfo.block_reason || 'Administrative action'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-red-500/70 mb-0.5">Blocked Until</span>
                  <span>{blockInfo.blocked_until}</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                If you believe this is a mistake, contact us at:{' '}
                <a href={`mailto:${blockInfo.contact_email}`} className="text-text-accent font-bold hover:underline block mt-1 break-all">
                  {blockInfo.contact_email}
                </a>
              </p>
            </div>
          )}

          {/* --- Animated Form Container --- */}
          <div className="relative mt-8 h-auto">
            <AnimatePresence mode="wait">

              {/* --- Step 1: User Check Form --- */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleUserCheck}
                  className="space-y-6"
                >
                  <Input
                    id="usernameOrEmail"
                    label="Username or Email"
                    type="text"
                    placeholder="Enter your username or email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Continue'}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-background-secondary px-2 text-text-secondary">
                        OR
                      </span>
                    </div>
                  </div>

                  {/* --- Google Login Button --- */}
                  <div className="flex w-full justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleLoginSuccess}
                      onError={handleGoogleLoginError}
                      useOneTap={false}
                      theme="filled_blue"
                      shape="rectangular"
                      width="320px"
                    />
                  </div>
                </motion.form>
              )}

              {/* --- Step 2: Password Form --- */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleLoginSubmit}
                  className="space-y-6"
                >
                  <Input
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Log In'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => { setStep(1); setError(null); setPassword(''); }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* --- Link to Register --- */}
          <p className="mt-8 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-text-accent transition-colors hover:underline"
            >
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;