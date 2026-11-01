import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

import { logoutApi, me as fetchMe } from '../api/auth';

const TOKEN_KEY = 'jibunai_auth_token';
const USER_KEY = 'jibunai_auth_user';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Hydrate auth state from SecureStore on first load.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (!mounted) return;
        setToken(storedToken || null);
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } catch {
        if (!mounted) return;
        setToken(null);
        setUser(null);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (newToken, newUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    // Invalidate the session server-side; ignore network errors so local
    // logout always completes.
    if (token) {
      try {
        await logoutApi(token);
      } catch {
        /* server unreachable — local state is cleared regardless */
      }
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const userData = await fetchMe(token);
      setUser(userData);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch {
      // Token expired or invalid -> force logout.
      await logout();
      return null;
    }
  }, [token, logout]);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{ token, user, ready, isAuthenticated, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
