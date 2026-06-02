// Tiny API client for the KBiz Books backend (Express, port 9090 by default).
// The backend validates JWTs issued by CRM using the SAME secret, so single
// sign-on works: the user logs in to CRM, the same token authorizes KBiz.
//
// KBiz Books and the CRM share ONE MongoDB. The Books backend serves the
// already-shaped ticket / purchase collections from that shared database.

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

export async function apiGet(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  // The backend wraps every response as { success, data } (and the CRM uses the
  // same envelope). Unwrap so callers receive the bare payload (e.g. an array).
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

// ── Write helpers (POST / PUT / DELETE) ─────────────────────────────────────
async function apiWrite(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch { /* keep raw text */ }
    throw new Error(msg || `API ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

export const apiPost   = (path, body) => apiWrite('POST', path, body);
export const apiPut    = (path, body) => apiWrite('PUT', path, body);
export const apiDelete = (path)       => apiWrite('DELETE', path);
