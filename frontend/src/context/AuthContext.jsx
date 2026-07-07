import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContextInstance';

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(null); // Keep strictly in-memory state now (No localStorage parsing!)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Hold render frame until rotation validation confirms

  // Fetch logged in profile details
  const fetchUserProfile = async (currentToken) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Profile load failure:", err);
    }
  };

  // Automated Silenced Core Token Rotation Call
  const refreshAccessToken = useCallback(async () => {
    try {
      // Accessing with credentials flag forces the browser to ship along HTTP-only cookie tracking strings
      const res = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token); // Populate new short-lived access token into memory
        await fetchUserProfile(data.token);
        return data.token;
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Silent refresh loop malfunction:", err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  // Run on application startup once to check if an HTTP-only token exists
  useEffect(() => {
    refreshAccessToken();
  }, [refreshAccessToken]);

  // Set up an interval background heartbeat to refresh tokens every 14 minutes
  useEffect(() => {
    if (!token) return;

    const intervalTime = 14 * 60 * 1000; // 14 minutes
    const tokenRefresher = setInterval(() => {
      refreshAccessToken();
    }, intervalTime);

    return () => clearInterval(tokenRefresher);
  }, [token, refreshAccessToken]);

  // Inside AuthProvider component in AuthContext.jsx
  const handleLogout = async (onCleanup) => { // 👈 Accept a cleanup callback function
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout fetch failed", err);
    }

    // 👈 CRITICAL: Trigger component level cleanups BEFORE clearing tokens
    if (typeof onCleanup === 'function') {
      onCleanup();
    }

    setToken(null);
    setUser(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#131314', color: '#e3e3e3' }}>Loading Workspace...</div>;
  }

  return (
    <AuthContext.Provider value={{ token, setToken, user, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}