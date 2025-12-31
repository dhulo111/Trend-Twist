// frontend/src/components/common/Input.jsx

import React from 'react';

/**
 * A reusable Input component.
 *
 * @param {object} props
 * @param {string} props.id - Unique ID for the input, used for the label.
 * @param {string} [props.label] - The label text to display above the input.
 * @param {string} [props.type='text'] - Input type (text, password, email, etc.).
 * @param {string} props.placeholder - Placeholder text.
 * @param {string} props.value - The current value of the input.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Change handler.
 * @param {string} [props.error] - Error message to display below the input.
 * @param {boolean} [props.disabled=false] - If the input is disabled.
 * @param {string} [props.className] - Additional classes for the wrapper div.
 * @param {React.ReactNode} [props.icon] - An optional icon to display inside the input.
 */
const Input = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  className = '',
  icon,
}) => {
  // Base styles for the input
  const baseInputStyles = `
    w-full appearance-none rounded-lg border 
    bg-background-secondary px-4 py-2.5 
    text-text-primary placeholder-text-secondary 
    shadow-sm transition duration-200 
    focus:outline-none focus:ring-2
  `;

  // Dynamic styles based on state (error or default)
  const stateStyles = error
    ? 'border-red-500 focus:ring-red-500' // Error state
    : 'border-border focus:ring-text-accent'; // Default state

  return (
    <div className={`w-full ${className}`}>
      {/* --- Label --- */}
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}

      {/* --- Input Wrapper (for icon) --- */}
      <div className="relative">
        {/* --- Icon (if provided) --- */}
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-text-secondary">{icon}</span>
          </div>
        )}

        {/* --- Input Field --- */}
        <input
          type={type}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            ${baseInputStyles} 
            ${stateStyles} 
            ${icon ? 'pl-10' : ''}
            ${disabled ? 'cursor-not-allowed bg-background-accent opacity-60' : ''}
          `}
        />
      </div>

      {/* --- Error Message --- */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Input;