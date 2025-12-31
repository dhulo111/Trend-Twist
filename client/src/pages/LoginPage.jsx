// frontend/src/pages/LoginPage.jsx

import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google'; // <-- 1. Import this component
import { jwtDecode } from 'jwt-decode';
// --- Icon Imports from react-icons ---
import { FcGoogle } from 'react-icons/fc';
import { IoMdTrendingUp } from 'react-icons/io';
import { BsMoonStarsFill, BsSunFill } from 'react-icons/bs'; // <-- Added icons

// --- Animation Variants ---
const formVariants = {
  hidden: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.3 } },
};

const LoginPage = () => {
  // --- States and Context ---
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light'); // <-- Added theme state
  const { requestLoginOTP, verifyLoginOTP, googleLogin } = useContext(AuthContext);

  // --- Theme Toggle Effect ---
  // Applies the saved theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []); // Empty array ensures this runs only once on mount

  // --- Theme Toggle Handler ---
  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // --- Handlers (Same as before) ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await requestLoginOTP(email);
      setOtpRequestId(response.id);
      setStep(2);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || 'Failed to send OTP. Please check the email.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyLoginOTP(otpRequestId, otp);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || 'Login failed. The code may be invalid or expired.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    setOtp('');
    try {
      const response = await requestLoginOTP(email);
      setOtpRequestId(response.id);
    } catch (err) {
      setError('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    // credentialResponse contains the ID Token
    const googleToken = credentialResponse.credential;

    // You can decode it to see info (optional)
    // const decoded = jwtDecode(googleToken);

    setLoading(true);
    setError(null);
    try {
      // Send the token to our backend
      await googleLogin(googleToken);
      // AuthContext will handle navigation
    } catch (err) {
      setError('Google Login Failed. Please try again.');
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
        onClick={handleThemeToggle}
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
              {step === 1 ? 'Welcome Back' : 'Enter Your Code'}
            </h1>
            <p className="mt-2 text-text-secondary">
              {step === 1
                ? 'Enter your email to get a login code.'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* --- Error Display --- */}
          {error && (
            <p className="mt-4 rounded-md bg-red-500/10 p-3 text-center text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          {/* --- Animated Form Container --- */}
          <div className="relative mt-8 h-auto">
            <AnimatePresence mode="wait">

              {/* --- Step 1: Email Form --- */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleEmailSubmit}
                  className="space-y-6"
                >
                  <Input
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Send Login Code'}
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
                      useOneTap={false} // Use the standard button flow
                      theme="filled_blue"
                      shape="rectangular"
                      width="320px" // Match the form width
                    />
                  </div>
                </motion.form>
              )}

              {/* --- Step 2: OTP Form --- */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleOtpSubmit}
                  className="space-y-6"
                >
                  <Input
                    id="otp"
                    label="6-Digit Code"
                    type="text"
                    placeholder="Enter the code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    maxLength={6}
                  />
                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Verify & Log In'}
                  </Button>
                  <div className="text-center text-sm text-text-secondary">
                    Didn't get a code?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-medium text-text-accent transition-colors hover:underline disabled:text-text-secondary"
                      disabled={loading}
                    >
                      Resend code
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => { setStep(1); setError(null); setOtp(''); }}
                    disabled={loading}
                  >
                    Back to Email
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