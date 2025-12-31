// frontend/src/components/layout/Footer.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { IoLogoTwitter, IoLogoInstagram, IoLogoYoutube } from 'react-icons/io5';

const Footer = () => {
  return (
    // The footer uses a slightly darker border and primary background color
    // to separate it visually from the main content.
    <footer className="mt-12 w-full border-t border-border bg-background-secondary px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* --- Top Section: Links and Socials --- */}
        <div className="flex flex-wrap justify-between border-b border-border/50 pb-6 mb-6">

          {/* Brand/Logo */}
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold text-text-accent">TrendTwist</h3>
            <p className="text-sm text-text-secondary mt-1">
              Discover, Create, and Twist.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col space-y-2 text-sm">
            <h4 className="font-semibold text-text-primary mb-1">Company</h4>
            <Link to="/about" className="text-text-secondary hover:text-text-accent transition-colors">
              About Us
            </Link>
            <Link to="/careers" className="text-text-secondary hover:text-text-accent transition-colors">
              Careers
            </Link>
            <Link to="/blog" className="text-text-secondary hover:text-text-accent transition-colors">
              Blog
            </Link>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col space-y-2 text-sm mt-4 md:mt-0">
            <h4 className="font-semibold text-text-primary mb-1">Support</h4>
            <Link to="/help" className="text-text-secondary hover:text-text-accent transition-colors">
              Help Center
            </Link>
            <Link to="/privacy" className="text-text-secondary hover:text-text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-text-secondary hover:text-text-accent transition-colors">
              Terms of Service
            </Link>
          </div>

          {/* Social Icons */}
          <div className="flex space-x-4 mt-6 md:mt-0">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
              className="text-text-secondary hover:text-blue-400 transition-colors">
              <IoLogoTwitter className="h-6 w-6" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
              className="text-text-secondary hover:text-pink-500 transition-colors">
              <IoLogoInstagram className="h-6 w-6" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
              className="text-text-secondary hover:text-red-600 transition-colors">
              <IoLogoYoutube className="h-6 w-6" />
            </a>
          </div>
        </div>


        {/* --- Bottom Section: Copyright --- */}
        <div className="flex flex-col items-center justify-between text-sm text-text-secondary md:flex-row">
          <p>&copy; {new Date().getFullYear()} TrendTwist Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;