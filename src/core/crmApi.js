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

const CRM_BASE = import.meta.env.VITE_CRM_API_BASE || 'http://localhost:5000/api';

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
