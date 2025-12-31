// frontend/src/components/common/Modal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A reusable, animated Modal component.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controls if the modal is open or closed.
 * @param {() => void} props.onClose - Function to call when the modal should close.
 * @param {React.ReactNode} props.children - Content to display inside the modal.
 * @param {string} [props.title] - Optional title for the modal header.
 * @param {string} [props.className] - Additional classes for the modal panel.
 */
const Modal = ({ isOpen, onClose, children, title, className = '' }) => {
  // Animation variants for the backdrop
  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  // Animation variants for the modal panel
  const modalVariants = {
    hidden: {
      y: '-50px',
      scale: 0.9,
      opacity: 0,
    },
    visible: {
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    exit: {
      y: '50px',
      scale: 0.9,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    // AnimatePresence handles the 'exit' animation when isOpen becomes false
    <AnimatePresence>
      {isOpen && (
        <>
          {/* --- 1. Backdrop Overlay --- */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose} // Close modal on backdrop click
          />

          {/* --- 2. Modal Container --- */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* --- 3. Modal Panel --- */}
            <motion.div
              className={`
                relative w-full max-w-md overflow-hidden 
                rounded-2xl bg-background-secondary 
                shadow-2xl border border-border
                ${className}
              `}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* --- Modal Header (Optional) --- */}
              <div className="flex items-center justify-between border-b border-border p-5">
                {title ? (
                  <h3 className="text-lg font-semibold text-black">
                    {title}
                  </h3>
                ) : (
                  <div /> // Placeholder for spacing
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-text-secondary transition-colors
                             hover:bg-background-accent hover:text-black
                             focus:outline-none focus:ring-2 focus:ring-text-accent"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* --- Modal Body --- */}
              <div className="p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;