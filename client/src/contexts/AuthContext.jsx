/**
 * AuthContext.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Provides authentication state and actions to the React tree.
 *
 * Key improvements over the original:
 *
 *  1. Reads initial tokens via tokenStorage (role-scoped keys) — never raw
 *     localStorage.getItem('accessToken').
 *
 *  2. Cross-tab logout listener: when another tab clears a session the
 *     `storage` event fires for the LOGOUT_BROADCAST_KEY.  If the cleared
 *     role matches this tab's active role, we force a logout here too.
 *     This prevents a stale admin session from making API calls after the
 *     admin logged out in a different tab.
 *
 *  3. The `login` action delegates entirely to authService (which calls
 *     saveSession via tokenStorage) and then syncs the Zustand store.
 *     No double-writing to localStorage from both authService and the context.
 *
 *  4. The bootstrap `useEffect` uses tokenStorage helpers, not bare keys.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService }  from '../services/authService';
import {
  getAccessToken,
  clearSession,
  LOGOUT_BROADCAST_KEY,
} from '../utils/tokenStorage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { user, isAuthenticated, setAuth, logout, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // ── Bootstrap: verify stored token on first render ──────────────────────
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const token = getAccessToken();  // role-scoped read

      if (token && !user) {
        try {
          // Validate token against the server and hydrate the store
          const currentUser = await authService.getCurrentUser();
          if (!cancelled) {
            const at = getAccessToken();  // may have been refreshed by interceptor
            setAuth({
              user:         currentUser,
              accessToken:  at,
              refreshToken: null,  // store already has this from initial hydration
            });
          }
        } catch {
          // Token is invalid / expired and refresh also failed
          if (!cancelled) {
            logout();
          }
        }
      }

      if (!cancelled) setLoading(false);
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []); // run once on mount — intentionally empty deps

  // ── Cross-tab logout listener ────────────────────────────────────────────
  useEffect(() => {
    const handleStorageEvent = (event) => {
      // LOGOUT_BROADCAST_KEY is set then immediately removed by broadcastLogout()
      // The `storage` event fires in OTHER tabs when the key is set.
      if (event.key !== LOGOUT_BROADCAST_KEY) return;
      if (!event.newValue) return;  // the remove fires with null — ignore

      try {
        const { role } = JSON.parse(event.newValue);
        const thisRole  = user?.role;

        // Only act if the broadcast concerns this tab's session
        if (!thisRole || thisRole === role) {
          logout();
          // Do not redirect here — ProtectedRoute handles that via isAuthenticated
        }
      } catch {
        // Malformed broadcast — ignore
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [user?.role, logout]);

  // ── login action ─────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    // authService.login() calls saveSession() → tokenStorage writes scoped keys
    const loggedInUser = await authService.login(credentials);

    // Sync the Zustand store from what tokenStorage just wrote
    const at = getAccessToken(loggedInUser.role);
    setAuth({
      user:         loggedInUser,
      accessToken:  at,
      refreshToken: null,  // store already hydrated via getRefreshToken()
    });

    return loggedInUser;
  }, [setAuth]);

  // ── logout action ─────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      // authService.logout() calls clearSession() + broadcastLogout()
      await authService.logout();
    } catch {
      // Server-side error is non-fatal; still clear local state
    } finally {
      logout();  // Zustand store reset
    }
  }, [logout]);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout:    handleLogout,
    updateUser,
    isAdmin:   user?.role === 'admin',
    isStudent: user?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
