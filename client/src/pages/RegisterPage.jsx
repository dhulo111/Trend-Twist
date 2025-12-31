// frontend/src/pages/RegisterPage.jsx (UPDATED FOR OTP VERIFICATION)

import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icon Imports ---
import { FcGoogle } from 'react-icons/fc';
import { IoMdTrendingUp } from 'react-icons/io';
import { BsMoonStarsFill, BsSunFill } from 'react-icons/bs';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { verifyRegistrationOTP } from '../api/authApi'; // <-- Import the new verification API

// --- Animation Variants (No Change) ---
const formVariants = {
  hidden: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.3 } },
};

const RegisterPage = () => {
  // --- States and Context ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState(null);
  const [isOtpVerified, setIsOtpVerified] = useState(false); // <-- NEW STATE to track verification

  const [userDetails, setUserDetails] = useState({
    username: '',
    first_name: '',
    last_name: '',
    google_token: null,
  });

  const { requestRegisterOTP, completeRegistration, googleLogin } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  // --- OTP Verification & Step Transition (Step 2 to Step 3) ---
  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // --- API CALL FOR VERIFICATION ---
      await verifyRegistrationOTP(otpRequestId, otp);

      // Verification successful! Move to next step.
      setIsOtpVerified(true);
      setStep(3);

    } catch (err) {
      // If API fails (OTP is wrong/expired)
      const errorMsg =
        err.response?.data?.error || 'Invalid or expired OTP. Please check the code or resend.';
      setError(errorMsg);
      setIsOtpVerified(false);
      setOtp(''); // Clear OTP input
    } finally {
      setLoading(false);
    }
  };

  // --- Complete Registration (Final Step 3) ---
  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Final check for empty fields
    if (!userDetails.username || !userDetails.first_name) {
      setError('Username and First Name are required.');
      setLoading(false);
      return;
    }

    try {
      if (userDetails.google_token) {
        // ... (Google Flow remains the same)
        await googleLogin(userDetails.google_token);
      } else {
        // --- Email/OTP Flow ---
        // IMPORTANT: The backend assumes the OTP is verified (is_verified=True) 
        // since we successfully called verifyRegistrationOTP in Step 2.
        const registrationData = {
          // We must send the original OTP and ID even if verified, for backend checks.
          id: otpRequestId,
          otp: otp,
          email: email,
          ...userDetails,
        };
        await completeRegistration(registrationData);
      }
    } catch (err) {
      // Catch errors like "Username taken"
      const errorMsg =
        err.response?.data?.error ||
        'Final registration failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers & Render Functions (Rest of the code remains the same) ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await requestRegisterOTP(email);
      setOtpRequestId(response.id);
      setStep(2);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || 'Failed to send OTP. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // ... (logic remains the same)
    setLoading(true);
    setError(null);
    setOtp('');
    try {
      const response = await requestRegisterOTP(email);
      setOtpRequestId(response.id);
    } catch (err) {
      setError('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    // ... (logic remains the same)
    const googleToken = credentialResponse.credential;
    setLoading(true);
    setError(null);

    const decoded = jwtDecode(googleToken);

    setStep(3);
    setEmail(decoded.email);
    setUserDetails({
      username: decoded.email.split('@')[0],
      first_name: decoded.given_name || '',
      last_name: decoded.family_name || '',
      google_token: googleToken,
    });
    setIsOtpVerified(true); // Mark as verified via Google
    setLoading(false);
  };

  const handleGoogleError = () => {
    setError('Google registration failed. Please try again or use email.');
  };

  const handleDetailsChange = (e) => {
    setUserDetails({
      ...userDetails,
      [e.target.id]: e.target.value,
    });
  };

  // --- Render Functions (Updated for cleaner look/logic) ---

  const renderStep1_Email = () => (
    // (Render logic remains the same)
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
        {loading ? <Spinner size="sm" /> : 'Send Verification Code'}
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

      <div className="flex w-full justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme={theme === 'dark' ? 'filled_blue' : 'outline'}
          shape="rectangular"
          width="320px"
        />
      </div>
    </motion.form>
  );

  const renderStep2_OTP = () => (
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
        placeholder="Enter the code sent to your email"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        disabled={loading || isOtpVerified} // Disable if already verified
        maxLength={6}
      />

      {/* Verify Button: Calls API to verify OTP */}
      <Button type="submit" fullWidth disabled={loading || otp.length !== 6 || isOtpVerified}>
        {loading ? <Spinner size="sm" /> : 'Verify Code'}
      </Button>

      {/* Resend OTP Option */}
      <div className="text-center text-sm text-text-secondary">
        Didn't get a code?{' '}
        <button
          type="button"
          onClick={handleResendOtp}
          className="font-medium text-text-accent transition-colors hover:underline disabled:text-text-secondary"
          disabled={loading || isOtpVerified}
        >
          Resend code
        </button>
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={() => setStep(1)}
        disabled={loading || isOtpVerified}
      >
        Back to Email
      </Button>
    </motion.form>
  );

  const renderStep3_Details = () => (
    <motion.form
      key="step3"
      variants={formVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onSubmit={handleDetailsSubmit}
      className="space-y-6"
    >
      <div className="rounded-lg border border-border/50 bg-background-accent p-3">
        <span className='font-semibold text-text-accent'>Email Verified!</span>
        <p className='text-sm text-text-secondary'>Now, choose your unique username.</p>
      </div>

      {/* Email Display */}
      <Input
        id="email_display"
        label="Email Address"
        type="text"
        value={email || (userDetails.google_token ? jwtDecode(userDetails.google_token).email : '')}
        disabled={true}
        className="opacity-70"
      />
      {/* User Details */}
      <Input
        id="username"
        label="Username"
        type="text"
        placeholder="Choose a unique username"
        value={userDetails.username}
        onChange={handleDetailsChange}
        disabled={loading}
      />
      {/* ... (First/Last Name Inputs remain the same) ... */}
      <div className="flex space-x-4">
        <Input
          id="first_name"
          label="First Name"
          type="text"
          placeholder="Your first name"
          value={userDetails.first_name}
          onChange={handleDetailsChange}
          disabled={loading}
        />
        <Input
          id="last_name"
          label="Last Name"
          type="text"
          placeholder="Your last name (Optional)"
          value={userDetails.last_name}
          onChange={handleDetailsChange}
          disabled={loading}
        />
      </div>
      {/* Final Submit */}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? <Spinner size="sm" /> : 'Complete Registration'}
      </Button>

      {/* Back Button for Email/OTP flow */}
      {!userDetails.google_token && (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => {
            setStep(2); // Go back to Step 2 to allow OTP change
            setIsOtpVerified(false); // Reset verification status
          }}
          disabled={loading}
        >
          Back to OTP
        </Button>
      )}
    </motion.form>
  );

  // --- Main Render (No Change) ---
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

      {/* --- 1. Left Column (Registration Form) --- */}
      <div className="flex w-full items-center justify-center p-4 md:w-1/2 lg:w-2/5">

        <div className="w-full max-w-md overflow-hidden rounded-2xl 
                        border border-border/50 bg-background-secondary/70 
                        p-8 shadow-2xl backdrop-blur-lg">

          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <IoMdTrendingUp className="h-10 w-10 text-text-accent" />
            <h1 className="mt-4 text-3xl font-bold text-text-primary">
              Create Your Account
            </h1>
            <p className="mt-2 text-text-secondary">
              {step === 1 && 'Step 1: Enter your email or use social login'}
              {step === 2 && `Step 2: Enter code sent to ${email}`}
              {step === 3 && 'Step 3: Set up your unique profile'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <p className="mt-4 rounded-md bg-red-500/10 p-3 text-center text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          {/* Animated Form Container */}
          <div className="relative mt-8 h-auto">
            <AnimatePresence mode="wait">
              {step === 1 && renderStep1_Email()}
              {step === 2 && renderStep2_OTP()}
              {step === 3 && renderStep3_Details()}
            </AnimatePresence>
          </div>

          {/* Link to Login */}
          <p className="mt-8 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-text-accent transition-colors hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* --- 2. Right Column (Image/Branding) --- */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 items-center justify-center p-12">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-5xl font-extrabold text-text-primary">
            Join the <span className="text-text-accent">Conversation</span>
          </h1>
          <p className="mt-4 max-w-md text-2xl text-text-secondary">
            Create an account to start, follow, and twist the latest trends.
          </p>
          <img
            src="https://gosharpener.com/content/uploads/photos/2024/09/sngine_554b7fb4220580094ff96ca152962eb8.jpg"
            alt="Register Graphic"
            className="mt-12 w-full max-w-lg rounded-2xl shadow-2xl"
          />
        </div>
      </div>

    </div>
  );
};

export default RegisterPage;