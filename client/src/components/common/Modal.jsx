import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A reusable, animated Modal component using React Portal.
 * Renders into document.body to break out of layout constraints.
 */
const Modal = ({ isOpen, onClose, children, title, className = '', fullScreen = false, hideHeader = false }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Animation variants for the backdrop
  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  // Animation variants for the modal panel
  const modalVariants = {
    hidden: {
      y: fullScreen ? '100%' : '-50px',
      scale: fullScreen ? 1 : 0.9,
      opacity: 0,
    },
    visible: {
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    exit: {
      y: fullScreen ? '100%' : '50px',
      scale: fullScreen ? 1 : 0.9,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999]">
          {/* --- 1. Backdrop Overlay --- */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          {/* --- 2. Modal Container --- */}
          <div 
            onClick={onClose} 
            className={`fixed inset-0 flex items-center justify-center ${fullScreen ? 'p-0' : 'p-4'}`}
          >
            {/* --- 3. Modal Panel --- */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className={`
                relative w-full overflow-hidden 
                bg-background-secondary 
                shadow-2xl
                ${fullScreen ? 'h-full max-w-none rounded-none' : 'max-w-md rounded-2xl border border-border'}
                ${className}
              `}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* --- Modal Header (Optional) --- */}
              {!hideHeader && (
                <div className={`flex items-center justify-between border-b border-border p-5 ${fullScreen ? 'sticky top-0 bg-background-secondary z-10' : ''}`}>
                  <div className="flex items-center space-x-4">
                    {fullScreen && (
                      <button 
                        onClick={onClose}
                        className="p-1 hover:bg-background-accent rounded-full transition-colors text-text-primary"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    {title ? (
                      <h3 className="text-lg font-semibold text-text-primary">
                        {title}
                      </h3>
                    ) : (
                      <div />
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-text-secondary transition-colors
                               hover:bg-background-accent hover:text-text-primary
                               focus:outline-none focus:ring-2 focus:ring-text-accent"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* --- Modal Body --- */}
              <div className={`${fullScreen ? (hideHeader ? 'h-full overflow-y-auto' : 'h-[calc(100%-70px)] overflow-y-auto') : 'p-6'}`}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;