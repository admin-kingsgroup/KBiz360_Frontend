/**
 * Support-ticket domain vocabulary + presentation helpers — the single place the
 * UI reads ticket type / status / priority labels and their brand tones (so a pill
 * looks identical in the table, the drawer and the floating dialog). Mirrors the
 * backend enums in kbiz360-erp-backend/src/features/support-tickets.
 */

// type → { label, tone } (StatusPill tones: neutral/info/success/warning/danger/gold/navy)
export const TICKET_TYPES = [
  { value: 'bug', label: 'Bug', tone: 'danger' },
  { value: 'error', label: 'Error', tone: 'danger' },
  { value: 'feature', label: 'Feature request', tone: 'info' },
  { value: 'improvement', label: 'Improvement', tone: 'gold' },
  { value: 'question', label: 'Question', tone: 'neutral' },
  { value: 'other', label: 'Other', tone: 'neutral' },
];

export const TICKET_PRIORITIES = [
  { value: 'low', label: 'Low', tone: 'neutral' },
  { value: 'medium', label: 'Medium', tone: 'info' },
  { value: 'high', label: 'High', tone: 'warning' },
  { value: 'urgent', label: 'Urgent', tone: 'danger' },
];

export const TICKET_STATUSES = [
  { value: 'open', label: 'Open', tone: 'warning' },
  { value: 'in_progress', label: 'In progress', tone: 'info' },
  { value: 'resolved', label: 'Resolved', tone: 'success' },
  { value: 'closed', label: 'Closed', tone: 'neutral' },
  { value: 'wont_fix', label: "Won't fix", tone: 'neutral' },
];

const byValue = (list) => list.reduce((m, o) => { m[o.value] = o; return m; }, {});
const TYPE_MAP = byValue(TICKET_TYPES);
const PRIORITY_MAP = byValue(TICKET_PRIORITIES);
const STATUS_MAP = byValue(TICKET_STATUSES);

export const typeMeta = (v) => TYPE_MAP[v] || { value: v, label: v || '—', tone: 'neutral' };
export const priorityMeta = (v) => PRIORITY_MAP[v] || { value: v, label: v || '—', tone: 'neutral' };
export const statusMeta = (v) => STATUS_MAP[v] || { value: v, label: v || '—', tone: 'neutral' };

const DONE = new Set(['resolved', 'closed', 'wont_fix']);
export const isDoneStatus = (v) => DONE.has(v);

/* ── Current user (read the same localStorage mirror the rest of the app uses) ── */
export function currentUser() {
  try { return JSON.parse(localStorage.getItem('kb360-user') || 'null') || {}; }
  catch { return {}; }
}

// Senior roles that may HARD-DELETE a ticket (everyone else closes it). Mirrors
// the backend TRIAGE_ADMIN_ROLES gate so the button only shows when it will work.
export function canDeleteTickets(user = currentUser()) {
  return /super.?admin|director|senior\s+finance\s+manager/i.test((user && user.role) || '');
}

// Best-effort ERP module for a route — powers the auto-captured `module` field and
// mirrors the route→module mapping in App.jsx so a ticket says where it was raised.
export function moduleForRoute(route = '') {
  const r = String(route);
  const table = [
    [/^\/(settings|ho)\b/, 'Settings'],
    [/^\/hr\b/, 'HR & Payroll'],
    [/^\/reports\b/, 'Reports'],
    [/^\/tax\b/, 'Taxation'],
    [/^\/(finance|assets|approvals)\b/, 'Finance'],
    [/^\/accounts\b/, 'Accounts'],
    [/^\/purchase\b/, 'Purchase'],
    [/^\/sales\b/, 'Sales'],
    [/^\/masters\b/, 'Masters'],
    [/^\/(dashboard|dashboards|group)\b/, 'Dashboard'],
    [/^\/support\b/, 'Support'],
  ];
  const hit = table.find(([rx]) => rx.test(r));
  return hit ? hit[1] : '';
}
