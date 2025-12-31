// frontend/src/context/ThemeContext.jsx

import React, { createContext, useState, useEffect } from 'react';
import { BsMoonStarsFill, BsSunFill } from 'react-icons/bs'; // Icons for the toggle

// 1. Create the Context
export const ThemeContext = createContext();

// 2. Create the Provider Component
export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  // --- Core Theme Application Effect ---
  useEffect(() => {
    // Apply the current theme state to the <html> tag
    document.documentElement.setAttribute('data-theme', theme);
    // Save the theme preference to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]); // Reruns whenever the 'theme' state changes

  // --- Theme Toggle Handler ---
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // --- Theme Toggle Icon Component (Reusable) ---
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      // Apply the theme classes
      className="rounded-full p-2.5 
                 bg-background-secondary/70 border border-border/50
                 text-text-secondary transition-colors hover:text-text-accent"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      {/* Show the moon icon if theme is light, and sun icon if theme is dark */}
      {theme === 'light' ? <BsMoonStarsFill className='h-5 w-5' /> : <BsSunFill className='h-5 w-5' />}
    </button>
  );

  // 3. Context Data
  const contextData = {
    theme: theme,
    toggleTheme: toggleTheme,
    ThemeToggle: ThemeToggle, // Export the component itself
  };

  // 4. Provider
  return (
    <ThemeContext.Provider value={contextData}>
      {children}
    </ThemeContext.Provider>
  );
};