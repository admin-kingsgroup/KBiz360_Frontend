// Axios API client for the KBiz Books backend (Express, port 9090 by default).
// The backend validates JWTs issued by CRM using the SAME secret, so single
// sign-on works: the user logs in to CRM, the same token authorizes KBiz.
//
// KBiz Books and the CRM share ONE MongoDB. The Books backend serves the
// already-shaped ticket / purchase collections from that shared database.
//
// ── Why axios behind the same apiGet/apiPost/apiPut/apiDelete surface ────────
// This module previously used fetch(). It now wraps a configured axios instance
// but keeps the EXACT same exported interface and behaviour, so not a single
// caller (core hooks, modules, App.jsx) needed to change:
//   • a request interceptor injects the Bearer token on every call
//   • a response interceptor unwraps the { success, data } envelope to the bare
//     payload and turns 204 into null
//   • auth failures (dead/expired token) clear the session and fire
//     'kbiz:auth-expired' so the shell bounces to the login screen
//   • params that are null / '' are dropped (so optional filters never become
//     ?branch=&from= noise) — identical to the old URLSearchParams behaviour

import axios from 'axios';
import { errMessage } from './apiError';
import { unwrapEnvelope } from './apiEnvelope';

const BASE = import.meta.env.VITE_KBIZ_API_BASE || 'http://localhost:9090';
// Exported for the rare consumer that needs raw fetch() against the same backend
// (e.g. Dev Control's wiring probes, which need HTTP status codes the axios
// interceptors strip). Everything else should use apiGet/apiPost below.
export const API_BASE = BASE;

// CRM stores its access token under 'kb360-token' in localStorage (see
// CRM-Frontend/src/api/axios.js). Reading the same key means a user logged
// into CRM can navigate to KBiz Books and the same JWT authorises them.
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'kb360-token';

// The logged-in user (incl. the `viewOnly` flag) is mirrored in localStorage by
// LoginScreen/App. Deep components (e.g. VoucherShell) read this to pre-disable
// write actions without prop-drilling currentUser everywhere.
const USER_KEY = 'kb360-user';
export function isViewOnly() {
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return !!(u && u.viewOnly);
  } catch { return false; }
}

// Approver roles (FULL_SCOPE_ROLES) may Revoke a posted voucher/booking back to
// Pending — stricter than Approve since it un-posts the books. Mirrors the role gate
// in voucherApprovals.jsx so deep drill-down components (VoucherShell / VoucherEditor)
// can offer Revoke without prop-drilling currentUser everywhere.
export function isApprover() {
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return /super.?admin|director|senior\s+finance\s+manager|sr\.?\s*accounts\s+executive/i.test((u && u.role) || '');
  } catch { return false; }
}

export function getAuthToken() {
  // Order: real SSO token (localStorage) → dev token → 'open' placeholder.
  // The 'open' placeholder is non-empty so the data hooks (enabled: !!token) still
  // fire; when the backend runs with AUTH_OPTIONAL=true it ignores the token. A
  // real login token always takes precedence and is used as-is.
  try {
    return localStorage.getItem(TOKEN_KEY) || import.meta.env.VITE_KBIZ_DEV_TOKEN || 'open';
  } catch {
    return import.meta.env.VITE_KBIZ_DEV_TOKEN || 'open';
  }
}

// A dead session (expired/invalid token) → clear it and tell the app to show the
// login screen. A 403 "Insufficient permissions" (role denial) is NOT a dead
// session, so we only bounce on 401, or a 403 whose message is about the token.
function handleAuthFailure(status, message) {
  const m = String(message || '');
  const dead = status === 401 || (status === 403 && /token|expired|sign ?in|books access|access to kbiz/i.test(m));
  if (!dead) return;
  try { localStorage.removeItem('kb360-token'); localStorage.removeItem('kb360-user'); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('kbiz:auth-expired', { detail: { status, message: m } })); } catch { /* ignore */ }
}

// Pull the human message out of a {success,message} error body. axios may give us
// the parsed object (JSON response) or a raw string — handle both, falling back
// to the raw value.
// A request timeout is essential: ReferenceProvider blocks the whole app behind
// a "Loading KBiz360…" splash until its critical reference queries SETTLE
// (success or error). Without a timeout a single slow/hanging backend call (or a
// dropped connection that never refuses) would leave that splash up forever. The
// timeout turns a hang into an error → the query settles → the app renders.
//
// Set to 60s (was 20s): heavy consolidated reports (e.g. the module-wise P&L /
// GP bills, which scan and transfer many vouchers) legitimately take 15-20s when
// the API talks to a remote/throttled Mongo Atlas link — the old 20s ceiling cut
// those off mid-flight and surfaced as a "page error". 60s is still a bounded
// backstop against a truly hung backend, just generous enough for the big reports.
const client = axios.create({ baseURL: BASE, timeout: 60_000 });

// ── Request: attach the current auth token to every call ────────────────────
client.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${getAuthToken()}`;
  return config;
});

// ── Response: unwrap the { success, data } envelope (204 → null), and on error
//    detect dead sessions before re-throwing with a human message ────────────
client.interceptors.response.use(
  (response) => {
    if (response.status === 204) return null;
    // Unwrap { success, data } but PRESERVE top-level siblings (e.g. gp-bills byBranch)
    // by hanging them on the returned value — see apiEnvelope.js.
    return unwrapEnvelope(response.data);
  },
  (error) => {
    const res = error.response;
    if (res) {
      const msg = errMessage(res.data);
      handleAuthFailure(res.status, msg);
      // Backend blocked a write for a view-only user → friendly toast (the button
      // may not have been pre-disabled, so this is the universal safety net).
      if (res.status === 403 && ((res.data && res.data.viewOnly === true) || /view-only/i.test(msg))) {
        try { window.dispatchEvent(new CustomEvent('kb:toast', { detail: { id: `vo-${Date.now()}`, msg: 'View only — changes are not allowed.', kind: 'error', ttl: 3200 } })); } catch { /* ignore */ }
      }
      return Promise.reject(new Error(msg || `API ${res.status}: ${res.statusText || 'Request failed'}`));
    }
    // No response → network/timeout/CORS. Surface axios's own message.
    return Promise.reject(new Error(error.message || 'Network error'));
  },
);

// Drop null / '' params so optional filters never leak into the query string.
function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') out[k] = v;
  });
  return out;
}

// The response interceptor already returns the unwrapped payload, so these
// resolve directly to the bare data (array / object / null) — same as before.
export async function apiGet(path, params = {}) {
  return client.get(path, { params: cleanParams(params) });
}

async function apiWrite(method, path, body) {
  return client.request({
    method,
    url: path,
    ...(body !== undefined ? { data: body } : {}),
  });
}

export const apiPost   = (path, body) => apiWrite('post', path, body);
export const apiPut    = (path, body) => apiWrite('put', path, body);
export const apiPatch  = (path, body) => apiWrite('patch', path, body);
export const apiDelete = (path)       => apiWrite('delete', path);
