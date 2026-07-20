// ───────────────────────────────────────────────────────────────────────────
// UNSAVED-CHANGES NAV GUARD
// A screen with a dirty form registers a check via useNavGuard(() => isDirty()).
// The app's navigate()/goBack()/goForward() (App.jsx) consult isGuardDirty() and ask
// the user to confirm before leaving — so an accidental click / drill-out no longer
// silently discards a half-filled voucher/master. The hook also arms a browser
// `beforeunload` prompt so a full-page refresh / tab close warns too (the in-app
// guard only covers SPA navigation). Module-level (hook-free) so navigate() can read
// it synchronously.
//
// A STACK of dirty-checks (not a single slot): guarded surfaces can NEST — an
// app-level ledger/booking overlay can mount a second guarded form on top of a
// still-mounted one (e.g. a voucher drill opened from the Party Master's "Open
// Ledger"). With a single slot, unmounting the top form nulled the guard and silently
// dropped the underlying form's protection. A stack keeps every mounted form's check
// live, so isGuardDirty() is true when ANY of them has unsaved changes, and
// unregistering one leaves the others intact.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

let guards = [];

// Register a dirty-check; returns an unregister fn (call on unmount). Removes only
// THIS fn from the stack, so a nested form unmounting can't drop a sibling's guard.
export function setNavGuard(fn) {
  guards.push(fn);
  return () => { guards = guards.filter((g) => g !== fn); };
}

export function clearNavGuard() { guards = []; }

// True when ANY mounted guarded form reports unsaved changes. Never throws — a
// compare error in one form must neither block navigation nor mask the others.
export function isGuardDirty() {
  return guards.some((fn) => { try { return !!fn(); } catch { return false; } });
}

// True when the MOST-RECENTLY-MOUNTED guarded form is dirty. Used by an overlay's own
// close (backdrop / ✕ / Back) to confirm discarding just the top editor — checking the
// global isGuardDirty() there would false-positive on an underlying guarded screen
// deeper in the stack (e.g. the Party Master beneath a voucher drill). Never throws.
export function isTopGuardDirty() {
  const fn = guards[guards.length - 1];
  if (!fn) return false;
  try { return !!fn(); } catch { return false; }
}

// Register the current screen's dirty-check for its lifetime. `isDirtyFn` is read live
// on each navigation (kept in a ref), so it always sees the latest state. Also arms a
// `beforeunload` handler for the same check, so a browser refresh/close on a dirty
// form prompts even though that path never hits the SPA navigate().
export function useNavGuard(isDirtyFn) {
  const ref = useRef(isDirtyFn);
  ref.current = isDirtyFn;
  useEffect(() => {
    const fn = () => { try { return !!ref.current?.(); } catch { return false; } };
    const off = setNavGuard(fn);
    const onBeforeUnload = (e) => { if (fn()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { off(); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, []);
}
