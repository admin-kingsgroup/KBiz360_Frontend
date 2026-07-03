// Thin client for the CRM backend, called directly from KBiz Books.
//
// CRM and KBiz share ONE database and ONE login token (SSO). A finance user
// logged into the system holds a CRM-issued JWT under 'kb360-token'; the CRM
// backend (cors: "*") accepts it from any origin. So the Books "Payment
// Verification" inbox can drive the CRM payment endpoints directly, reusing
// CRM's proven verify → tax-invoice → workflow logic untouched.
//
// Point VITE_CRM_API_BASE at the CRM backend (default below). This is separate
// from VITE_KBIZ_API_BASE, which targets the ERP/Books backend.

import { getAuthToken } from './api';

// Base-URL resolution: an explicit VITE_CRM_API_BASE wins, but a localhost value
// is only honoured when the app itself runs on localhost — the committed .env is
// dev-tuned, and an Amplify/production build without the env var must never call
// localhost. Deployed builds fall back to the production CRM API.
const PROD_CRM_BASE = 'https://kb360crm.duckdns.org/api';
const envBase = import.meta.env.VITE_CRM_API_BASE || '';
const onLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const CRM_BASE = (envBase && (!/localhost|127\.0\.0\.1/.test(envBase) || onLocalhost))
  ? envBase
  : (onLocalhost ? 'http://localhost:8080/api' : PROD_CRM_BASE);

async function request(method, path, { params, body } = {}) {
  const url = new URL(CRM_BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') url.searchParams.set(k, v); });
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `CRM API ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  // CRM wraps responses as { success, message, data } — unwrap to the payload.
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

export const crmGet = (path, params) => request('GET', path, { params });
export const crmPost = (path, body) => request('POST', path, { body });
export const CRM_BASE_URL = CRM_BASE;
