import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('campusmove_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('campusmove_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success) {
            setUser(res.user);
          }
        } catch (err) {
          console.warn('[AuthContext] Stale token session:', err.message);
          localStorage.removeItem('campusmove_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success) {
      localStorage.setItem('campusmove_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.success) {
      localStorage.setItem('campusmove_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('campusmove_token');
    setToken(null);
    setUser(null);
  };

  const quickDemoLogin = async (role) => {
    const creds = {
      student: { email: 'student@campusmove.edu', password: 'student123' },
      driver: { email: 'driver@campusmove.edu', password: 'driver123' },
      admin: { email: 'admin@campusmove.edu', password: 'admin123' },
    };

    if (creds[role]) {
      return await login(creds[role].email, creds[role].password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
