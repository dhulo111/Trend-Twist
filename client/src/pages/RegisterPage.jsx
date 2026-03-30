// frontend/src/pages/RegisterPage.jsx
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icon Imports ---
import { IoMdTrendingUp, IoMdCheckmarkCircleOutline } from 'react-icons/io';
import { BsMoonStarsFill, BsSunFill, BsCheck2, BsX } from 'react-icons/bs';
import { IoMaleOutline, IoFemaleOutline, IoMaleFemaleOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const RegisterPage = () => {
  // --- States and Context ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRules, setShowRules] = useState(false);

  const [userDetails, setUserDetails] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    gender: '',
    google_token: null,
  });

  const { registerWithPassword, googleLogin } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  // --- Password Strength Logic ---
  const getStrength = (password) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const strength = getStrength(userDetails.password);
  const strengthLabels = ['Weak', 'Weak', 'Medium', 'Medium', 'Strong', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-500'];

  const rules = [
    { label: 'Minimum 8 characters', test: (p) => p.length >= 8 },
    { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
    { label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Password Match Check
    if (!userDetails.google_token && userDetails.password !== userDetails.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    // Password Strength Check
    if (!userDetails.google_token && strength < 5) {
      setError('Please make sure your password meets all security requirements shown below.');
      setLoading(false);
      return;
    }

    // Final check for empty fields
    if (!userDetails.username || !userDetails.email || (!userDetails.google_token && !userDetails.password) || !userDetails.first_name) {
      setError('Username, Email, Password and First Name are required.');
      setLoading(false);
      return;
    }

    try {
      if (userDetails.google_token) {
        await googleLogin(userDetails.google_token);
      } else {
        // Remove confirmPassword before sending to backend
        const { confirmPassword, ...dataToSend } = userDetails;
        await registerWithPassword(dataToSend);
      }
    } catch (err) {
      let errorMsg = 'Registration failed. Please try again.';
      if (err.response?.data) {
          const data = err.response.data;
          if (data.error) errorMsg = data.error;
          else if (typeof data === 'object') {
              const firstKey = Object.keys(data)[0];
              const firstVal = data[firstKey];
              errorMsg = Array.isArray(firstVal) ? firstVal[0] : firstVal;
              if (firstKey !== 'error' && firstKey !== 'detail') {
                  errorMsg = `${firstKey}: ${errorMsg}`;
              }
          }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const googleToken = credentialResponse.credential;
    setLoading(true);
    setError(null);

    const decoded = jwtDecode(googleToken);

    setUserDetails({
      ...userDetails,
      email: decoded.email,
      username: decoded.email.split('@')[0],
      first_name: decoded.given_name || '',
      last_name: decoded.family_name || '',
      google_token: googleToken,
    });
    
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

    if (e.target.id === 'password' && !showRules && e.target.value.length > 0) {
      setShowRules(true);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-gradient-to-br from-background-primary via-background-secondary to-background-primary text-text-primary">

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

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md overflow-visible rounded-2xl 
                        border border-border/50 bg-background-secondary/70 
                        p-8 shadow-2xl backdrop-blur-lg"
        >

          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <IoMdTrendingUp className="h-10 w-10 text-text-accent" />
            <h1 className="mt-4 text-3xl font-bold">
              Create Your Account
            </h1>
            <p className="mt-2 text-text-secondary">
              Join the conversation today.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <p className="mt-4 rounded-md bg-red-500/10 p-3 text-center text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          {/* Form Container */}
          <div className="relative mt-8">
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="flex flex-col gap-4">
                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={userDetails.email}
                  onChange={handleDetailsChange}
                  disabled={loading || !!userDetails.google_token}
                  required
                />
                
                <div className="flex gap-4">
                  <Input
                    id="username"
                    label="Username"
                    type="text"
                    placeholder="unique_id"
                    value={userDetails.username}
                    onChange={handleDetailsChange}
                    disabled={loading}
                    required
                  />
                  <Input
                    id="phone_number"
                    label="Phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={userDetails.phone_number}
                    onChange={handleDetailsChange}
                    disabled={loading}
                  />
                </div>

                {!userDetails.google_token && (
                  <div className="relative">
                    <Input
                      id="password"
                      label="Password"
                      type="password"
                      placeholder="Min 8 characters"
                      value={userDetails.password}
                      onChange={handleDetailsChange}
                      disabled={loading}
                      required
                    />
                    
                    {/* Floating Rules Animation */}
                    <AnimatePresence>
                      {showRules && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: 20 }}
                          className="absolute left-full ml-6 top-0 z-50 hidden w-64 rounded-xl border border-border/50 bg-background-secondary/90 p-4 shadow-2xl backdrop-blur-md lg:block"
                        >
                          <div className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
                            <IoMdCheckmarkCircleOutline className="text-text-accent" />
                            Password Requirements
                          </div>
                          <ul className="space-y-2 text-xs">
                            {rules.map((rule, idx) => {
                              const isPassed = rule.test(userDetails.password);
                              return (
                                <li key={idx} className={`flex items-center gap-2 ${isPassed ? 'text-green-500' : 'text-text-secondary'}`}>
                                  {isPassed ? <BsCheck2 className="h-3 w-3" /> : <BsX className="h-3 w-3" />}
                                  {rule.label}
                                </li>
                              );
                            })}
                          </ul>
                          
                          {/* Triangle Pointer */}
                          <div className="absolute top-6 -left-2 h-4 w-4 rotate-45 border-l border-b border-border/50 bg-background-secondary/90" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mobile/Small Screen Rules (Inline) */}
                    <AnimatePresence>
                      {showRules && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 overflow-hidden lg:hidden"
                        >
                          <div className="rounded-lg bg-background-accent/30 p-3">
                            <ul className="space-y-1 text-[10px]">
                              {rules.map((rule, idx) => {
                                const isPassed = rule.test(userDetails.password);
                                return (
                                  <li key={idx} className={`flex items-center gap-1.5 ${isPassed ? 'text-green-500' : 'text-text-secondary'}`}>
                                    {isPassed ? <BsCheck2 className="h-2.5 w-2.5" /> : <BsX className="h-2.5 w-2.5" />}
                                    {rule.label}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Strength Indicator */}
                    {userDetails.password && (
                      <div className="mt-2 text-left">
                        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                          <span>Strength</span>
                          <span className={`${strengthColors[strength].replace('bg-', 'text-')}`}>
                            {strengthLabels[strength]}
                          </span>
                        </div>
                        <div className="mt-1 flex h-1 gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div 
                              key={i} 
                              className={`h-full flex-1 rounded-full transition-all duration-300 ${i < strength ? strengthColors[strength] : 'bg-border/30'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!userDetails.google_token && (
                  <Input
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    placeholder="Repeat your password"
                    value={userDetails.confirmPassword}
                    onChange={handleDetailsChange}
                    disabled={loading}
                    required
                    error={userDetails.confirmPassword && userDetails.password !== userDetails.confirmPassword ? 'Passwords do not match' : null}
                  />
                )}

                <div className="flex gap-4">
                  <Input
                    id="first_name"
                    label="First Name"
                    type="text"
                    placeholder="First"
                    value={userDetails.first_name}
                    onChange={handleDetailsChange}
                    disabled={loading}
                    required
                  />
                  <Input
                    id="last_name"
                    label="Last Name"
                    type="text"
                    placeholder="Last (Opt)"
                    value={userDetails.last_name}
                    onChange={handleDetailsChange}
                    disabled={loading}
                  />
                </div>

                {/* Gender Selection */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Gender <span className="text-text-secondary font-normal">(Optional)</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'male', label: 'Male', icon: <IoMaleOutline className="h-4 w-4" />, gradient: 'from-blue-500 to-cyan-500' },
                      { value: 'female', label: 'Female', icon: <IoFemaleOutline className="h-4 w-4" />, gradient: 'from-pink-500 to-rose-500' },
                      { value: 'other', label: 'Other', icon: <IoMaleFemaleOutline className="h-4 w-4" />, gradient: 'from-purple-500 to-violet-500' },
                      { value: 'prefer_not_to_say', label: 'Skip', icon: null, gradient: 'from-gray-500 to-gray-600' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setUserDetails({ ...userDetails, gender: opt.value })}
                        disabled={loading}
                        className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all duration-300 cursor-pointer
                          ${
                            userDetails.gender === opt.value
                              ? `border-transparent bg-gradient-to-br ${opt.gradient} text-white shadow-lg scale-[1.03]`
                              : 'border-border/50 bg-background-primary/30 text-text-secondary hover:border-text-accent/30'
                          }
                        `}
                      >
                        {opt.icon && <span>{opt.icon}</span>}
                        <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
                        {userDetails.gender === opt.value && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
                            <IoCheckmarkCircleOutline className="text-green-600" style={{ fontSize: '10px' }} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Create Account'}
              </Button>

              {!userDetails.google_token && (
                <>
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
                </>
              )}
            </form>
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
        </motion.div>
      </div>

      {/* --- 2. Right Column (Image/Branding) --- */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 items-center justify-center p-12">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-5xl font-extrabold">
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