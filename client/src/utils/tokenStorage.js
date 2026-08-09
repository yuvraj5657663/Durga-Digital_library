/**
 * tokenStorage.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Role-scoped localStorage manager.
 *
 * WHY:
 *   Using bare keys like "accessToken" means every browser tab — regardless of
 *   whether the admin or a student is signed in — writes to the same slot.
 *   When a student opens a new tab and logs in, their token silently overwrites
 *   the admin's token, and vice-versa. The next API call from the admin tab
 *   fires with a student JWT → 403 → forced logout.
 *
 * HOW:
 *   Keys are namespaced by role:
 *     ddl.admin.accessToken   ddl.admin.refreshToken   ddl.admin.user
 *     ddl.student.accessToken ddl.student.refreshToken ddl.student.user
 *
 *   The active role for the current tab is stored in sessionStorage
 *   (tab-local, survives page refresh within the same tab, cleared when the
 *   tab is closed).  This lets two tabs genuinely hold different sessions.
 *
 *   The role is also decoded from the JWT itself (no crypto verify needed —
 *   we only read the public payload) so we can bootstrap from an existing
 *   stored token without a round-trip.
 */

const NS = 'ddl';

/* ── JWT payload decode (no signature verify — client-side only) ─────────── */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function getRoleFromToken(token) {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.role || null;  // 'admin' | 'student'
}

/* ── Determine active role for this tab ──────────────────────────────────── */

/**
 * Returns the role that is currently active in this browser tab.
 * Resolution order:
 *   1. sessionStorage (set explicitly during login/logout — most reliable)
 *   2. Decoded from any access token already stored in localStorage
 *      (bootstraps page refreshes without requiring a new login)
 *   3. null  (no session)
 */
export function getActiveRole() {
  // Tab-local role wins
  const tabRole = sessionStorage.getItem(`${NS}.role`);
  if (tabRole === 'admin' || tabRole === 'student') return tabRole;

  // Fall back: decode from whichever token is stored
  for (const role of ['admin', 'student']) {
    const token = localStorage.getItem(`${NS}.${role}.accessToken`);
    if (token) {
      const decoded = decodeJwtPayload(token);
      if (decoded?.role === role) {
        // Persist in sessionStorage so subsequent reads are O(1)
        sessionStorage.setItem(`${NS}.role`, role);
        return role;
      }
    }
  }
  return null;
}

/** Explicitly set the active role for this tab (called on login). */
export function setActiveRole(role) {
  if (role) sessionStorage.setItem(`${NS}.role`, role);
  else      sessionStorage.removeItem(`${NS}.role`);
}

/* ── Scoped key helpers ──────────────────────────────────────────────────── */
function key(role, field) {
  return `${NS}.${role}.${field}`;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/** Save a full auth session (tokens + user) for a given role. */
export function saveSession({ role, accessToken, refreshToken, user }) {
  if (!role) throw new Error('[tokenStorage] role is required');
  localStorage.setItem(key(role, 'accessToken'),  accessToken);
  localStorage.setItem(key(role, 'refreshToken'), refreshToken);
  localStorage.setItem(key(role, 'user'),         JSON.stringify(user));
  setActiveRole(role);
}

/** Clear the stored session for a given role (or the current tab's role). */
export function clearSession(role) {
  const r = role || getActiveRole();
  if (!r) return;
  localStorage.removeItem(key(r, 'accessToken'));
  localStorage.removeItem(key(r, 'refreshToken'));
  localStorage.removeItem(key(r, 'user'));
  setActiveRole(null);
}

/** Read the access token for the current tab's active role. */
export function getAccessToken(role) {
  const r = role || getActiveRole();
  if (!r) return null;
  return localStorage.getItem(key(r, 'accessToken'));
}

/** Read the refresh token for the current tab's active role. */
export function getRefreshToken(role) {
  const r = role || getActiveRole();
  if (!r) return null;
  return localStorage.getItem(key(r, 'refreshToken'));
}

/** Read the stored user object for the current tab's active role. */
export function getUser(role) {
  const r = role || getActiveRole();
  if (!r) return null;
  try {
    return JSON.parse(localStorage.getItem(key(r, 'user')));
  } catch {
    return null;
  }
}

/** Write a new access token (e.g. after a silent refresh). */
export function setAccessToken(accessToken, role) {
  const r = role || getActiveRole();
  if (!r) return;
  localStorage.setItem(key(r, 'accessToken'), accessToken);
}

/** Write a new refresh token (rotation). */
export function setRefreshToken(refreshToken, role) {
  const r = role || getActiveRole();
  if (!r) return;
  localStorage.setItem(key(r, 'refreshToken'), refreshToken);
}

/** Update only the stored user object (e.g. after profile edit). */
export function updateUser(userData, role) {
  const r = role || getActiveRole();
  if (!r) return;
  const current = getUser(r) || {};
  const merged  = { ...current, ...userData };
  localStorage.setItem(key(r, 'user'), JSON.stringify(merged));
  return merged;
}

/**
 * Returns true if there is a valid (non-expired) access token for any role.
 * Does NOT verify the JWT signature — just checks existence + expiry.
 */
export function hasAnySession() {
  for (const role of ['admin', 'student']) {
    const token = localStorage.getItem(key(role, 'accessToken'));
    if (!token) continue;
    const payload = decodeJwtPayload(token);
    if (payload?.exp && payload.exp * 1000 > Date.now()) return true;
  }
  return false;
}

/**
 * Cross-tab logout event key.
 * Other tabs listen for this key in a `storage` event to clear their session.
 */
export const LOGOUT_BROADCAST_KEY = `${NS}.logout`;

/** Broadcast a logout to all other tabs. */
export function broadcastLogout(role) {
  localStorage.setItem(LOGOUT_BROADCAST_KEY, JSON.stringify({ role, ts: Date.now() }));
  // Remove immediately so the next logout of the same role fires the event again
  localStorage.removeItem(LOGOUT_BROADCAST_KEY);
}
