'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3008';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from token on mount
  useEffect(() => {
    async function rehydrateSession() {
      try {
        const storedToken = localStorage.getItem('aether_token');
        if (storedToken) {
          const res = await fetch(`${AUTH_SERVICE_URL}/v1/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              setUser({ ...data.user, credits: data.user.credits_balance });
              setToken(storedToken);
            } else {
              logout();
            }
          } else {
            logout();
          }
        }
      } catch (e) {
        console.warn('Session rehydration failed:', e);
      } finally {
        setLoading(false);
      }
    }
    rehydrateSession();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        const userData = { ...data.user, credits: data.user.credits_balance };
        setUser(userData);
        setToken(data.token);
        localStorage.setItem('aether_token', data.token);
        return { success: true, user: userData, token: data.token };
      }
      return { success: false, error: data.error?.message || data.message || 'Login failed' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        const userData = { ...data.user, credits: data.user.credits_balance };
        setUser(userData);
        setToken(data.token);
        localStorage.setItem('aether_token', data.token);
        return { success: true, user: userData, token: data.token };
      }
      return { success: false, error: data.error?.message || 'Signup failed' };
    } catch (err) {
      console.error('Signup error:', err);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('aether_token');
  };

  const deductUserCredits = (amount) => {
    if (user) {
      const updated = { ...user, credits: Math.max(0, (user.credits || user.credits_balance || 0) - amount) };
      setUser(updated);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser({ ...data.user, credits: data.user.credits_balance });
        }
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        deductUserCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
