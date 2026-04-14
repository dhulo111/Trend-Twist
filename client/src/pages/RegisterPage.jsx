// frontend/src/pages/RegisterPage.jsx
import React, { useState, useContext, useEffect } from 'react';
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
import axiosInstance from '../api/axiosInstance';
import loginHero from '../assets/login_hero.png';

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

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.post('/auth/register/send-otp/', { email: userDetails.email });
      setResendTimer(60); // 60 seconds cooldown
    } catch (err) {
      let errorMsg = 'Failed to resend OTP. Please try again.';
      if (err.response?.data?.error) errorMsg = err.response.data.error;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Initial Registration Validation
    if (step === 1) {
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
          // Send OTP
          await axiosInstance.post('/auth/register/send-otp/', { email: userDetails.email });
          setStep(2); // Move to OTP verification
          setResendTimer(60); // Start 60s cooldown immediately on first send
        }
      } catch (err) {
        let errorMsg = 'Failed to send OTP. Please try again.';
        if (err.response?.data?.error) errorMsg = err.response.data.error;
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- STEP 2: VERIFY OTP AND REGISTER ---
    if (step === 2) {
      if (!otp || otp.length < 6) {
        setError('Please enter a valid 6-digit OTP.');
        setLoading(false);
        return;
      }

      try {
        const { confirmPassword, ...dataToSend } = userDetails;
        dataToSend.otp = otp;
        await registerWithPassword(dataToSend);
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

  const handlePasswordFocus = () => {
    if (userDetails.password.length >= 0) {
      setShowRules(true);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background-primary font-sans relative overflow-x-hidden">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 rounded-full p-3 
                   bg-background-secondary/80 border border-border/20
                   text-text-primary shadow-lg transition-transform hover:scale-110"
      >
        {theme === 'light' ? <BsMoonStarsFill /> : <BsSunFill />}
      </button>

      {/* Left Column (Registration Form) */}
      <div className="flex w-full items-center justify-center lg:w-1/2 p-6 sm:p-12 relative overflow-y-auto no-scrollbar py-12 h-screen">
        <div className="w-full max-w-lg space-y-6 my-auto pt-10 pb-16">
          
          <div className="text-center lg:text-left mb-8">
            <img src="/logo1.png" alt="TrendTwist" className="h-14 w-14 object-contain drop-shadow-lg mb-6 lg:mx-0 mx-auto" />
            <h2 className="text-4xl font-bold text-text-primary tracking-tight">Create your account</h2>
            <p className="mt-3 text-text-secondary w-full text-base">
              Join the conversation today and discover what's trending.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="relative">
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              {step === 1 ? (
                <div className="flex flex-col gap-4">
                  <Input
                    id="email"
                    label=""
                    className="h-14! text-lg rounded-xl!"
                    type="email"
                    placeholder="Email Address"
                    value={userDetails.email}
                    onChange={handleDetailsChange}
                    disabled={loading || !!userDetails.google_token}
                    required
                  />
                  
                  <div className="flex gap-4">
                    <Input
                      id="username"
                      label=""
                      className="h-14! rounded-xl!"
                      type="text"
                      placeholder="Username"
                      value={userDetails.username}
                      onChange={handleDetailsChange}
                      disabled={loading}
                      required
                    />
                    <Input
                      id="phone_number"
                      label=""
                      className="h-14! rounded-xl!"
                      type="tel"
                      placeholder="Phone (Optional)"
                      value={userDetails.phone_number}
                      onChange={handleDetailsChange}
                      disabled={loading}
                    />
                  </div>

                  {!userDetails.google_token && (
                    <div className="relative">
                      <Input
                        id="password"
                        label=""
                        className="h-14! rounded-xl!"
                        type="password"
                        placeholder="Password (Min 8 characters)"
                        value={userDetails.password}
                        onChange={handleDetailsChange}
                        onFocus={handlePasswordFocus}
                        disabled={loading}
                        required
                      />
                      
                      {/* Floating Rules Animation - REMOVED from side, now on Image */}
                      
                      {/* Mobile/Small Screen Rules (Inline) */}
                      <AnimatePresence>
                        {showRules && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 overflow-hidden xl:hidden"
                          >
                            <div className="rounded-xl border border-border/50 bg-background-secondary/50 p-3">
                              <ul className="space-y-1.5 text-[11px]">
                                {rules.map((rule, idx) => {
                                  const isPassed = rule.test(userDetails.password);
                                  return (
                                    <li key={idx} className={`flex items-center gap-1.5 ${isPassed ? 'text-green-500' : 'text-text-secondary'}`}>
                                      {isPassed ? <BsCheck2 className="h-3 w-3" /> : <BsX className="h-3 w-3" />}
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
                        <div className="mt-3 text-left pl-1">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
                            <span>Strength</span>
                            <span className={`${strengthColors[strength].replace('bg-', 'text-')}`}>
                              {strengthLabels[strength]}
                            </span>
                          </div>
                          <div className="mt-1.5 flex h-1.5 gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div 
                                key={i} 
                                className={`h-full flex-1 rounded-full transition-all duration-500 ${i < strength ? strengthColors[strength] : 'bg-border/40'}`} 
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
                      label=""
                      className="h-14! rounded-xl!"
                      type="password"
                      placeholder="Confirm Password"
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
                      label=""
                      className="h-14! rounded-xl!"
                      type="text"
                      placeholder="First Name"
                      value={userDetails.first_name}
                      onChange={handleDetailsChange}
                      disabled={loading}
                      required
                    />
                    <Input
                      id="last_name"
                      label=""
                      className="h-14! rounded-xl!"
                      type="text"
                      placeholder="Last Name"
                      value={userDetails.last_name}
                      onChange={handleDetailsChange}
                      disabled={loading}
                    />
                  </div>

                  {/* Gender Selection */}
                  <div className="mt-2">
                    <label className="block text-sm font-semibold text-text-primary mb-2">Gender <span className="text-text-muted font-normal">(Optional)</span></label>
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
                          className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl border-2 transition-all duration-300 cursor-pointer
                            ${
                              userDetails.gender === opt.value
                                ? `border-transparent bg-gradient-to-br ${opt.gradient} text-white shadow-lg scale-[1.02]`
                                : 'border-border/40 bg-background-primary text-text-secondary hover:border-blue-500/30'
                            }
                          `}
                        >
                          {opt.icon && <span>{opt.icon}</span>}
                          <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                          {userDetails.gender === opt.value && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                              <IoCheckmarkCircleOutline className="text-blue-500" style={{ fontSize: '12px' }} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-text-secondary">
                      We've sent a 6-digit OTP to <br/><span className="font-bold text-text-primary">{userDetails.email}</span>
                    </p>
                  </div>
                  <Input
                    id="otp"
                    label=""
                    className="h-16! rounded-2xl! text-center text-3xl tracking-[0.5em] font-bold"
                    type="text"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    required
                    maxLength={6}
                  />
                  <div className="flex justify-between items-center text-sm font-semibold mt-2">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)} 
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || loading}
                      className={`transition-colors ${
                        resendTimer > 0 
                          ? 'text-text-muted cursor-not-allowed' 
                          : 'text-blue-500 hover:text-blue-600'
                      }`}
                    >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              )}
              
              <Button type="submit" fullWidth disabled={loading} className="h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/25 mt-6">
                {loading ? <Spinner size="sm" /> : (step === 1 ? 'Verify & Continue' : 'Create Account')}
              </Button>

              {step === 1 && !userDetails.google_token && (
                <>
                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-sm font-medium">
                      <span className="bg-background-primary px-4 text-text-muted">OR</span>
                    </div>
                  </div>

                  <div className="flex w-full justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap={false}
                      theme="filled_blue"
                      shape="rectangular"
                      size="large"
                      width="100%"
                    />
                  </div>
                </>
              )}
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-500 hover:text-blue-600 transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column (Image Hero) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black">
        <img
          src={loginHero}
          alt="Trend Twist Sign Up"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }} // Flip image to make it look distinct from login page
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

        {/* Floating Password Requirements Card (Over Image) */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
            >
              <div className="w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                {/* Decorative background elements */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-500" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors duration-500" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <IoMdCheckmarkCircleOutline className="text-blue-400 text-2xl" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Security Check</h3>
                  </div>
                  
                  <ul className="space-y-4">
                    {rules.map((rule, idx) => {
                      const isPassed = rule.test(userDetails.password);
                      return (
                        <motion.li 
                          key={idx} 
                          initial={false}
                          animate={{ x: isPassed ? 5 : 0 }}
                          className={`flex items-center gap-3 text-sm transition-colors duration-300 ${isPassed ? 'text-green-400' : 'text-gray-300'}`}
                        >
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                            isPassed ? 'bg-green-500 border-green-500' : 'bg-white/5 border-white/20'
                          }`}>
                            {isPassed ? <BsCheck2 className="text-white text-sm" /> : <BsX className="text-white text-sm" />}
                          </div>
                          <span className={isPassed ? 'font-semibold text-white' : 'font-normal'}>{rule.label}</span>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowRules(false); }}
                    className="mt-8 w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                  >
                    Got it, OK
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default RegisterPage;