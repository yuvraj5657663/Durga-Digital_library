/**
 * authStore.js  (Zustand)
 * ──────────────────────────────────────────────────────────────────────────────
 * In-memory React state for the authenticated session.
 *
 * Source of truth for persistence is tokenStorage (role-scoped localStorage).
 * This store is the in-memory reflection of that state — it never reads/writes
 * raw localStorage keys like "accessToken" directly.
 */

import { create } from 'zustand';
import {
  getUser,
  getAccessToken,
  getRefreshToken,
  saveSession,
  clearSession,
  updateUser as tsUpdateUser,
  broadcastLogout,
} from '../utils/tokenStorage';

// Staff roles that should be treated as 'admin' for token storage
const STAFF_ROLES = ['admin', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'SUPPORT'];

export const useAuthStore = create((set, get) => ({
  // ── Initial hydration from role-scoped storage ────────────────────────────
  // `getUser()` + `getAccessToken()` resolve the active role from sessionStorage
  // or from the stored token payload, so the store correctly bootstraps even
  // after a page refresh.
  user:            getUser()         || null,
  accessToken:     getAccessToken()  || null,
  refreshToken:    getRefreshToken() || null,
  isAuthenticated: !!getAccessToken(),

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Persist a new session and update in-memory state.
   * Called after a successful login (via AuthContext.login).
   */
  setAuth: ({ user, accessToken, refreshToken }) => {
    const role = user?.role;
    if (!role) {
      console.error('[authStore] setAuth: user has no role — cannot scope storage');
      return;
    }
    // Normalize staff roles to 'admin' for storage
    const normalizedRole = STAFF_ROLES.includes(role) ? 'admin' : role;
    // Persist to role-scoped localStorage
    saveSession({ role: normalizedRole, accessToken, refreshToken, user });

    // Update Zustand state
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  /**
   * Wipe the session: clears role-scoped storage, resets Zustand state,
   * and broadcasts logout to other tabs.
   */
  logout: () => {
    const role = get().user?.role || null;
    const normalizedRole = role && STAFF_ROLES.includes(role) ? 'admin' : role;
    clearSession(normalizedRole);
    broadcastLogout(normalizedRole);
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
    });
  },

  /**
   * Patch the stored user object (e.g. after a profile update).
   * Merges the supplied fields into both storage and Zustand state.
   */
  updateUser: (userData) => {
    const role = get().user?.role;
    const normalizedRole = role && STAFF_ROLES.includes(role) ? 'admin' : role;
    const merged  = tsUpdateUser(userData, normalizedRole);  // updates localStorage
    set({ user: merged });
  },

  // ── Convenience selectors (stable references — safe in useSelector) ───────
  isAdmin:   () => STAFF_ROLES.includes(get().user?.role),
  isStudent: () => get().user?.role === 'student',
}));
