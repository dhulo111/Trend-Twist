// frontend/src/components/common/Button.jsx

import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for internal navigation support

/**
 * A reusable Button component with support for standard buttons and React Router links.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The content inside the button.
 * @param {() => void} [props.onClick] - Click event handler (for type='button').
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - Button type.
 * @param {'primary' | 'secondary' | 'danger' | 'disabled'} [props.variant='primary'] - Button style.
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Button size.
 * @param {boolean} [props.disabled=false] - If the button is disabled.
 * @param {boolean} [props.fullWidth=false] - If the button should span full width.
 * @param {string} [props.className] - Additional classes.
 * @param {React.ReactNode} [props.leftIcon] - Icon to show on the left.
 * @param {string} [props.to] - Target URL for React Router navigation (if provided, renders a Link).
 */
const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  className = '',
  leftIcon,
  to,
}) => {
  // --- Base Styles ---
  const baseStyles =
    'flex items-center justify-center font-semibold rounded-lg shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary';

  // --- Variant Styles ---
  const variantStyles = {
    primary: `
      bg-text-accent text-white 
      hover:bg-text-accent/90 
      focus:ring-text-accent
      disabled:bg-text-accent/50 disabled:shadow-none
    `,
    secondary: `
      bg-background-secondary text-text-primary 
      border border-border 
      hover:bg-background-accent 
      focus:ring-text-accent
      disabled:opacity-60 disabled:shadow-none
    `,
    danger: `
      bg-red-600 text-white 
      hover:bg-red-700 
      focus:ring-red-500
      disabled:bg-red-400 disabled:shadow-none
    `,
    // New disabled variant for clear non-interactiveness
    disabled: `
      bg-background-accent text-text-secondary 
      border border-border/50 
      cursor-not-allowed opacity-70 shadow-none
    `,
  };

  // --- Size Styles ---
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base', // Slightly increased padding for better touch target
    lg: 'px-6 py-3.5 text-lg',
  };

  // Use the 'disabled' variant explicitly if disabled=true
  const currentVariant = disabled ? 'disabled' : variant;

  const finalClassName = `
    ${baseStyles}
    ${variantStyles[currentVariant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  const content = (
    <>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
    </>
  );

  // If 'to' prop is provided, render a Link component
  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={finalClassName.trim().replace(/\s+/g, ' ')}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  // Otherwise, render a standard button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={finalClassName.trim().replace(/\s+/g, ' ')}
    >
      {content}
    </button>
  );
};

export default Button;