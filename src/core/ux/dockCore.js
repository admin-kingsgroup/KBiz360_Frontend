// ───────────────────────────────────────────────────────────────────────────
// Dock — pure list logic for the "minimized / parked items" tray. No React, no
// prefs, no I/O, so it is trivially unit-testable (see __tests__/dock.test.jsx).
// The React provider/hook lives in dock.jsx and re-exports these.
// ───────────────────────────────────────────────────────────────────────────

export const MAX_PARKED = 6;   // cap; oldest falls off (Decision C)

// Stable identity: same ledger/route under the same branch is ONE chip (dedupe).
export function dockId(item) {
  const key = (item.payload && (item.payload.name || item.payload.route)) || item.label || '';
  return `${item.kind}:${key}:${item.branch || ''}`;
}

// Add (or re-float) an item: dedupe by id, newest-first, capped at `max`.
export function addParked(list, item, max = MAX_PARKED) {
  const it = { ...item, id: item.id || dockId(item) };
  const without = (Array.isArray(list) ? list : []).filter((x) => x.id !== it.id);
  return [it, ...without].slice(0, max);
}

export function removeParked(list, id) {
  return (Array.isArray(list) ? list : []).filter((x) => x.id !== id);
}
