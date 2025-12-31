// frontend/src/components/common/Avatar.jsx (FINAL Working Version)

import React, { useState, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';

const Avatar = ({ src, alt = 'avatar', size = 'md', className = '', onClick }) => {
  const MEDIA_BASE_URL = 'http://127.0.0.1:8000';
  const DEFAULT_IMAGE_STRING = 'default_avatar';

  const [imageFailed, setImageFailed] = useState(false);

  // --- 1. Calculate the FINAL, Absolute Source URL ---
  const cleanSrc = src && src.trim() !== '' ? src : null;
  const isDefaultImage = cleanSrc && cleanSrc.includes(DEFAULT_IMAGE_STRING);
  let finalSrc = null;

  if (cleanSrc && !isDefaultImage) {
    const needsPrefix = !cleanSrc.startsWith('http');
    finalSrc = needsPrefix
      ? `${MEDIA_BASE_URL}${cleanSrc.startsWith('/') ? cleanSrc : '/' + cleanSrc}`
      : cleanSrc;
  }

  // --- CRITICAL FIX 1: Reset failure state when a new URL is calculated ---
  // If finalSrc changes, the component should try loading again.
  useEffect(() => {
    setImageFailed(false);
  }, [finalSrc]); // Depend only on the final calculated URL


  // --- 2. Define Classes ---
  const sizeClasses = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-16 w-16', xl: 'h-24 w-24' };
  const finalSizeClass = sizeClasses[size];
  const finalClassName = `
    ${finalSizeClass} 
    rounded-full 
    object-cover 
    bg-background-accent 
    border border-border 
    flex-shrink-0 
    ${className}
  `;

  const DefaultAvatarIcon = () => (
    <div
      className={`
            ${finalClassName} 
            bg-background-secondary 
            text-text-secondary 
            p-1
        `}
      onClick={onClick}
    >
      <FaUserCircle className="w-full h-full" />
    </div>
  );

  // --- Render Logic ---

  // If finalSrc is null, is default, OR if the image load failed
  if (!finalSrc || isDefaultImage || imageFailed) {
    return <DefaultAvatarIcon />;
  }

  // Render the image
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={finalClassName}
      onClick={onClick}
      // On error, set state to true
      onError={() => {
        console.error("❌ Avatar failed to load:", finalSrc);
        setImageFailed(true);
      }}
    />
  );
};

export default Avatar;