import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components -- the hook lives next to its provider
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Public read-only demo (server DEMO_READONLY=1): hide every upload/edit/admin control (codex review 6243).
  const [readOnly, setReadOnly] = useState(false);

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
    fetch('/api/auth/config').then((r) => r.json()).then((c) => setReadOnly(!!c.readOnly)).catch(() => {});
  }, []);

  const login = async () => {
    localStorage.removeItem('app_logged_out');
    localStorage.removeItem('dev_logged_out');
    // Demo copy (AUTH_MODE=demo): sign in by picking a demo person.
    try {
      const cfg = await (await fetch('/api/auth/config')).json();
      if (cfg.signIn) { window.location.href = cfg.signIn; return; }
    } catch { /* fall back to Cloudflare */ }
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
    <AuthContext.Provider value={{ user, loading, login, logout, readOnly }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
