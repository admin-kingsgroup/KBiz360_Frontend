// ─── TK GROUP · FE · Owner identity (pure) ───────────────────────────────────
// The Owner (Afshin · Super Admin) has full override in the control layer, so their
// Control-Panel toggle applies LIVE (self-approved) instead of queuing for approval —
// mirroring the Owner-only gate on POST /api/tk/flags/set. Reads the mirrored session
// user from localStorage. Deliberately kept OUT of core/api (which pulls import.meta /
// axios and so can't load under jest) so the component stays unit-testable.
// 'super_admin' and 'Super Admin' are the same Owner identity.
export function isOwner() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('kb360-user') : null;
    const u = JSON.parse(raw || 'null');
    return /^\s*(super.?admin|owner)\s*$/i.test((u && u.role) || '');
  } catch { return false; }
}
