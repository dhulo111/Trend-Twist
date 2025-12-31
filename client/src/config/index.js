// frontend/src/config/index.js

// Import all environment variables using Vite's syntax (import.meta.env)

/**
 * Configuration variables loaded from the .env file.
 */
const config = {
  // --- API Configuration ---
  // Reads VITE_API_BASE_URL from the frontend/.env file
  // Fallback to the default Django runserver address
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",

  // Reads VITE_GOOGLE_CLIENT_ID from the .env file (used in main.jsx)
  GOOGLE_CLIENT_ID:
    import.meta.env.VITE_GOOGLE_CLIENT_ID || "fallback-client-id",

  // --- Other Constants (optional) ---
  POST_LIMIT: 10,
  MAX_BIO_LENGTH: 250,
};

// Example of frontend/.env file content:
/*
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
*/

export default config;
