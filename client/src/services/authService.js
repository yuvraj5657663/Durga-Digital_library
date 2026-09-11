/**
 * authService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * All auth API calls.  Writes tokens through tokenStorage (role-scoped keys)
 * instead of raw localStorage so multi-tab sessions never overwrite each other.
 */

import api from './api';
import {
  saveSession,
  clearSession,
  getUser,
  broadcastLogout,
} from '../utils/tokenStorage';

// Staff roles that should be treated as 'admin' for token storage
const STAFF_ROLES = ['admin', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'SUPPORT'];

export const authService = {
  /**
   * Authenticate and persist the session under the role-scoped key.
   * Returns the user object (matches what the server sends).
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, refreshToken, user } = response.data.data || response.data;

    if (!accessToken || !user) {
      throw new Error('Invalid login response — no token or user received.');
    }

    // Role comes from the server response; normalize staff roles to 'admin'
    const role = STAFF_ROLES.includes(user.role) ? 'admin' : user.role;
    saveSession({ role, accessToken, refreshToken, user });

    return user;
  },

  /**
   * Sign out: hit the server logout endpoint (best-effort),
   * then clear local storage + broadcast to other tabs.
   */
  logout: async () => {
    const user = getUser();  // read before clearing
    try {
      await api.post('/auth/logout');
    } catch {
      // Server-side logout failure is non-fatal
    } finally {
      const role = user?.role || null;
      const normalizedRole = role && STAFF_ROLES.includes(role) ? 'admin' : role;
      clearSession(normalizedRole);
      broadcastLogout(normalizedRole);
    }
  },

  /** Fetch the authenticated user's profile from the server. */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data.data || response.data;
  },

  /** Change password for the currently authenticated user. */
  changePassword: async (passwords) => {
    const response = await api.post('/auth/change-password', passwords);
    return response.data.data;
  },

  /** Register a new user (admin-initiated student registration). */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data.data;
  },
};
