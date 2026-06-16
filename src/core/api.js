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

const BASE = import.meta.env.VITE_KBIZ_API_BASE || 'http://localhost:9090';

// CRM stores its access token under 'kb360-token' in localStorage (see
// CRM-Frontend/src/api/axios.js). Reading the same key means a user logged
// into CRM can navigate to KBiz Books and the same JWT authorises them.
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'kb360-token';

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
function errMessage(data) {
  if (data == null) return '';
  if (typeof data === 'string') {
    try { return JSON.parse(data).message || data; } catch { return data; }
  }
  if (typeof data === 'object') return data.message || JSON.stringify(data);
  return String(data);
}

// A request timeout is essential: ReferenceProvider blocks the whole app behind
// a "Loading KBiz360…" splash until its critical reference queries SETTLE
// (success or error). Without a timeout a single slow/hanging backend call (or a
// dropped connection that never refuses) would leave that splash up forever. The
// timeout turns a hang into an error → the query settles → the app renders.
const client = axios.create({ baseURL: BASE, timeout: 20_000 });

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
    const json = response.data;
    return json && typeof json === 'object' && 'data' in json ? json.data : json;
  },
  (error) => {
    const res = error.response;
    if (res) {
      const msg = errMessage(res.data);
      handleAuthFailure(res.status, msg);
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
export const apiDelete = (path)       => apiWrite('delete', path);
