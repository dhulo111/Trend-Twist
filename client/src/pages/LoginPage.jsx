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
import loginHero from '../assets/login_hero.png';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axiosInstance';

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
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [blockInfo, setBlockInfo] = useState(null);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

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

  const handleForgotPasswordRequest = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/forgot-password/send-otp/', { username_or_email: usernameOrEmail });
      setStep(3);
      setResendTimer(60);
      setSuccessMsg(`OTP sent to the email associated with ${usernameOrEmail}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/forgot-password/send-otp/', { username_or_email: usernameOrEmail });
      setResendTimer(60);
      setSuccessMsg('OTP resent successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/forgot-password/reset/', {
        username_or_email: usernameOrEmail,
        otp,
        new_password: newPassword
      });
      setSuccessMsg('Password reset successfully. You can now log in.');
      setStep(2);
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background-primary font-sans relative overflow-hidden">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 rounded-full p-3 
                   bg-background-secondary/80 border border-border/20
                   text-text-primary shadow-lg transition-transform hover:scale-110"
      >
        {theme === 'light' ? <BsMoonStarsFill /> : <BsSunFill />}
      </button>

      {/* Left Column (Image Hero) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black">
        <img
          src={loginHero}
          alt="Trend Twist Sign In"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Black overlay for perfect contrast */}
        <div className="absolute inset-0 bg-black/60"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-12">
          <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tight shadow-black drop-shadow-2xl mb-6">
            Trend<span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Twist</span>
          </h1>
          <p className="text-2xl font-medium text-gray-100 leading-relaxed shadow-black drop-shadow-md max-w-xl">
            Sign in to catch up with friends, discover viral content, and ride the next wave.
          </p>
        </div>
      </div>

      {/* Right Column (Form) */}
      <div className="flex w-full items-center justify-center lg:w-1/2 p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
            <img src="/logo1.png" alt="TrendTwist" className="h-14 w-14 object-contain drop-shadow-lg mb-6 lg:mx-0 mx-auto" />
            <h2 className="text-4xl font-bold text-text-primary tracking-tight">
              {step === 1 ? 'Welcome back' : step === 2 ? 'Enter password' : 'Reset password'}
            </h2>
            <p className="mt-3 text-text-secondary w-full text-base">
              {step === 1
                ? 'Please enter your details to sign in.'
                : step === 2
                ? `Enter password for ${usernameOrEmail}`
                : `Enter OTP sent to your email and your new password`}
            </p>
          </div>

          {successMsg && (
            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">{successMsg}</p>
            </div>
          )}

          {error && !blockInfo && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {blockInfo && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-red-500 mb-2">Account Blocked</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Your account has been temporarily restricted for violating our community guidelines.
              </p>
              <div className="flex flex-col gap-3 p-4 bg-red-500/5 dark:bg-black/20 rounded-xl text-sm font-medium text-text-primary mb-4 border border-red-500/10">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-red-500/70 mb-1">Reason</span>
                  <span>{blockInfo.block_reason || 'Administrative action'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-red-500/70 mb-1">Blocked Until</span>
                  <span>{blockInfo.blocked_until}</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                If you believe this is a mistake, contact us at:{' '}
                <a href={`mailto:${blockInfo.contact_email}`} className="text-blue-500 font-semibold hover:underline block mt-1 break-all">
                  {blockInfo.contact_email}
                </a>
              </p>
            </div>
          )}

          <div className="relative">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleUserCheck}
                  className="space-y-5"
                >
                  <Input
                    id="usernameOrEmail"
                    label=""
                    className="h-14! text-lg rounded-xl!"
                    type="text"
                    placeholder="Username or email address"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <Button type="submit" fullWidth disabled={loading} className="h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/25">
                    {loading ? <Spinner size="sm" /> : 'Continue'}
                  </Button>

                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-sm font-medium">
                      <span className="bg-background-primary px-4 text-text-muted">OR</span>
                    </div>
                  </div>

                  <div className="flex justify-center w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleLoginSuccess}
                      onError={handleGoogleLoginError}
                      useOneTap={false}
                      theme="filled_blue"
                      shape="rectangular"
                      size="large"
                      width="100%"
                    />
                  </div>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleLoginSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-3">
                    <Input
                      id="password"
                      label=""
                      className="h-14! text-lg rounded-xl!"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleForgotPasswordRequest}
                        className="text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <Button type="submit" fullWidth disabled={loading} className="h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/25 mt-2">
                    {loading ? <Spinner size="sm" /> : 'Sign In'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    className="h-12 rounded-xl font-semibold border-2"
                    onClick={() => { setStep(1); setError(null); setSuccessMsg(null); setPassword(''); }}
                    disabled={loading}
                  >
                    Back to email
                  </Button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleResetPasswordSubmit}
                  className="space-y-5"
                >
                  <Input
                    id="otp"
                    label="Verification code"
                    className="h-12! rounded-xl!"
                    type="text"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    maxLength={6}
                    required
                  />
                  <Input
                    id="newPassword"
                    label="New password"
                    className="h-12! rounded-xl!"
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || loading}
                      className={`text-sm font-semibold transition-colors ${
                        resendTimer > 0 
                          ? 'text-text-muted cursor-not-allowed' 
                          : 'text-blue-500 hover:text-blue-600'
                      }`}
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                    </button>
                  </div>

                  <Button type="submit" fullWidth disabled={loading} className="h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/25 mt-2">
                    {loading ? <Spinner size="sm" /> : 'Update password'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    className="h-12 rounded-xl font-semibold border-2"
                    onClick={() => { setStep(2); setError(null); setSuccessMsg(null); }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-10 text-center">
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-blue-500 hover:text-blue-600 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;