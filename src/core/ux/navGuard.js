// ───────────────────────────────────────────────────────────────────────────
// UNSAVED-CHANGES NAV GUARD
// A screen with a dirty form registers a check via useNavGuard(() => isDirty()).
// The app's navigate() (App.jsx) consults isGuardDirty() and asks the user to
// confirm before leaving — so an accidental click / drill-out no longer silently
// discards a half-filled voucher/master. Module-level (hook-free) so navigate()
// can read it synchronously. Only ONE screen guards at a time (last mount wins),
// which is correct: one editable form is on screen at a time.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

let guardFn = null;

// Register a dirty-check; returns an unregister fn (call on unmount).
export function setNavGuard(fn) {
  guardFn = fn;
  return () => { if (guardFn === fn) guardFn = null; };
}

export function clearNavGuard() { guardFn = null; }

// True when the active screen reports unsaved changes. Never throws.
export function isGuardDirty() {
  try { return !!(guardFn && guardFn()); } catch { return false; }
}

// Register the current screen's dirty-check for its lifetime. `isDirtyFn` is read
// live on each navigation (kept in a ref), so it always sees the latest state.
export function useNavGuard(isDirtyFn) {
  const ref = useRef(isDirtyFn);
  ref.current = isDirtyFn;
  useEffect(() => setNavGuard(() => { try { return !!ref.current?.(); } catch { return false; } }), []);
}
