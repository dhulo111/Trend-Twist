import { useEffect, useRef } from 'react';

const PING_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/ping/`;

// Ping every 14 minutes (Render spins down after 15 min of inactivity)
const PING_INTERVAL_MS = 14 * 60 * 1000;

/**
 * useKeepAlive — silently keeps the Render free-tier backend warm.
 *
 * Sends a GET request to /api/ping/ every 14 minutes so the server
 * never hits the 15-minute inactivity threshold that causes a cold start.
 * The request is fire-and-forget; errors are silently swallowed so they
 * never affect the user experience.
 */
const useKeepAlive = () => {
  const intervalRef = useRef(null);

  useEffect(() => {
    const ping = () => {
      fetch(PING_URL, { method: 'GET', cache: 'no-store' })
        .catch(() => { /* silently ignore errors */ });
    };

    // Send an immediate ping on mount so the server wakes up right away
    // if it had gone cold while the user was away, then schedule regular pings.
    ping();
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
};

export default useKeepAlive;
