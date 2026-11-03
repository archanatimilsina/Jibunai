import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logoutApi, me as fetchMe } from '../api/auth';
import { secureDelete, secureGet, secureSet } from '../api/secureStore';

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

  // Hydrate auth state. The token lives in SecureStore (Keychain/Keystore);
  // on first launch after this change we migrate a legacy AsyncStorage token.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let storedToken = await secureGet(TOKEN_KEY);
        if (!storedToken) {
          const legacy = await AsyncStorage.getItem(TOKEN_KEY);
          if (legacy) {
            await secureSet(TOKEN_KEY, legacy);
            await AsyncStorage.removeItem(TOKEN_KEY);
            storedToken = legacy;
          }
        }
        const storedUser = await AsyncStorage.getItem(USER_KEY);
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
    if (!newToken) throw new Error('Missing auth token.');
    await secureSet(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser ?? null));
    setToken(newToken);
    setUser(newUser ?? null);
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
    await secureDelete(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const userData = await fetchMe(token);
      setUser(userData);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch (err) {
      // Only drop the session when the server rejects the token (401).
      // Network timeouts / 5xx keep local state so a blip can't sign out.
      if (err?.status === 401) {
        await logout();
      }
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
