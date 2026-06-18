/* ════════════════════════════════════════════════════════════════════
   notifStore — lightweight shared notification + demo-record state
   ════════════════════════════════════════════════════════════════════
   Extracted from the ~1900-line helpers.jsx so that EAGER modules (core/hooks,
   core/business-logic, shell/NotifPanel) can read this small shared state
   WITHOUT statically importing helpers.jsx — which would otherwise drag the
   whole helpers feature (and, transitively, recharts) into the initial bundle.

   helpers.jsx re-exports everything here under the original names, so its many
   existing consumers keep importing from './helpers' unchanged. There is ONE
   definition of each binding (here), so all importers share the same instance.
   ──────────────────────────────────────────────────────────────────── */
import { NOTIFICATIONS_DATA } from './data';

/* ── Notifications ── */
export const _NOTIFS = [...NOTIFICATIONS_DATA];
export const _NOTIF_LISTENERS = new Set();
export function triggerNotifRefresh(){ _NOTIF_LISTENERS.forEach(fn => fn()); }
export function markNotifRead(id){
  const n = _NOTIFS.find(n => n.id === id);
  if(n) n.read = true;
  triggerNotifRefresh();
}
export function markAllRead(){ _NOTIFS.forEach(n => n.read = true); triggerNotifRefresh(); }

/* ── In-memory demo registers (start empty; populated by their screens) ── */
export const _PASSPORTS = [];
export const _VENDOR_TERMS = [];
export const _TDS_ENTRIES = [];
