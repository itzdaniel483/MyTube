import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    // Check if explicitly logged out (persistent)
    if (localStorage.getItem('app_logged_out') === 'true') {
      setLoading(false);
      return;
    }

    // Dev Mode: Check if explicitly logged out
    if (localStorage.getItem('dev_logged_out') === 'true') {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include' // Important for CORS if needed, though CF uses headers
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    localStorage.removeItem('app_logged_out');
    localStorage.removeItem('dev_logged_out');
    setLoading(true);
    checkAuth();
  };

  const logout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();

      // Store CF logout URL for later use (to force re-login)
      if (data.logoutUrl) {
        localStorage.setItem('cf_logout_url', data.logoutUrl);
      }

      // Soft logout: Update URL and state without reload
      const newUrl = `${window.location.pathname}?status=logged_out`;
      window.history.pushState({}, '', newUrl);
      localStorage.setItem('app_logged_out', 'true');
      setUser(null);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
