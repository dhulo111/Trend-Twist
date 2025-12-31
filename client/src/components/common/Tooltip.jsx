// frontend/src/components/common/Tooltip.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Tooltip = ({ children, content, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  // --- Animation ---
  const variants = {
    hidden: { opacity: 0, scale: 0.9, y: 6 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  // --- Tooltip positioning ---
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {/* --- Trigger element --- */}
      {children}

      {/* --- Tooltip content --- */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`absolute z-40 w-max max-w-xs rounded-xl 
                        border border-white/10 bg-background-secondary/60 
                        backdrop-blur-md shadow-xl px-3 py-1.5 
                        text-sm text-text-primary/90 
                        transition-all duration-150
                        ${positionClasses[position]}`}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Arrow (blurred & subtle) */}
            <div
              className="absolute h-2 w-2 bg-background-secondary/60 
                         backdrop-blur-md border-white/10 transform rotate-45"
              style={{
                top: position === 'bottom' ? -4 : 'auto',
                bottom: position === 'top' ? -4 : 'auto',
                left: position === 'right' ? -4 : 'auto',
                right: position === 'left' ? -4 : 'auto',
                marginLeft:
                  position === 'top' || position === 'bottom' ? -4 : 0,
                marginTop: position === 'left' || position === 'right' ? -4 : 0,
              }}
            />
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
