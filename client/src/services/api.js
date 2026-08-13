/**
 * api.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Axios instance with:
 *   • Role-scoped token storage (no multi-tab token collision)
 *   • Refresh-lock to prevent concurrent 401 → refresh storms
 *   • Automatic retry of the original request after a successful refresh
 *   • Clean redirect to /login on irrecoverable auth failure
 */

import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearSession,
  broadcastLogout,
} from '../utils/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Request interceptor — attach Bearer token ─────────────────────────── */
api.interceptors.request.use(
  (config) => {
    // getAccessToken() reads from the role-scoped key for this tab's session
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No access token found for request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Refresh-lock — prevents N concurrent 401s each launching their own
       refresh request, which would invalidate each other's refresh tokens ── */
let isRefreshing       = false;
let refreshSubscribers = [];   // callbacks waiting for the new access token

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

function forceLogout() {
  const role = (getAccessToken() && null) || null;  // role is gone — clear everything
  clearSession();                 // clears scoped keys + sessionStorage role
  broadcastLogout(role);          // tell other tabs
  window.location.href = '/login';
}

/* ── Response interceptor — handle 401 with single refresh attempt ─────── */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    // This request wins the refresh race
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      // Use a plain axios call (not the intercepted instance) to avoid loops
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken }
      );

      const { accessToken: newAccess, refreshToken: newRefresh } =
        response.data.data || response.data;

      // Persist new tokens in role-scoped keys
      setAccessToken(newAccess);
      setRefreshToken(newRefresh);

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      notifyRefreshSubscribers(newAccess);

      return api(originalRequest);

    } catch (refreshError) {
      // Refresh itself failed — session is truly dead
      notifyRefreshSubscribers(null);
      forceLogout();
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

export const API_BASE = API_BASE_URL;
export default api;
