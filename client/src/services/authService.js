/**
 * authService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * All auth API calls.  Writes tokens through tokenStorage (role-scoped keys)
 * instead of raw localStorage so multi-tab sessions never overwrite each other.
 */

import api, { API_BASE } from './api';
import {
  saveSession,
  clearSession,
  getUser,
  broadcastLogout,
} from '../utils/tokenStorage';

export const authService = {
  /**
   * Authenticate and persist the session under the role-scoped key.
   * Returns the user object (matches what the server sends).
   */
  login: async (credentials) => {
    const response = await api.post(`${API_BASE}/auth/login`, credentials);
    const { accessToken, refreshToken, user } = response.data.data || response.data;

    if (!accessToken || !user) {
      throw new Error('Invalid login response — no token or user received.');
    }

    // Role comes from the server response; never trust the client to decide
    const role = user.role;  // 'admin' | 'student'
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
      await api.post(`${API_BASE}/auth/logout`);
    } catch {
      // Server-side logout failure is non-fatal
    } finally {
      const role = user?.role || null;
      clearSession(role);
      broadcastLogout(role);
    }
  },

  /** Fetch the authenticated user's profile from the server. */
  getCurrentUser: async () => {
    const response = await api.get(`${API_BASE}/auth/me`);
    return response.data.data || response.data;
  },

  /** Change password for the currently authenticated user. */
  changePassword: async (passwords) => {
    const response = await api.post(`${API_BASE}/auth/change-password`, passwords);
    return response.data.data;
  },

  /** Register a new user (admin-initiated student registration). */
  register: async (userData) => {
    const response = await api.post(`${API_BASE}/auth/register`, userData);
    return response.data.data;
  },
};
