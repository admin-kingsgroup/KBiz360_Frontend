// ───────────────────────────────────────────────────────────────────────────
// DOCK — the "minimized / parked items" store behind the ContextBar tray.
//
// A user can minimize a ledger (from the full-screen LedgerModalHost) or park a
// report route, and restore it later from a chip in the app-wide ContextBar.
//
//   const dock = useDock();
//   dock.park({ kind:'ledger', label:'Global Konnection', branch:'BOM',
//               payload:{ name:'Global Konnection', from:'', to:'' } });
//   dock.items        // [{ id, kind, label, branch, payload }]  newest-first
//   dock.unpark(id);  dock.clear();
//
// Persistence rides the existing per-user prefs (prefs.parked → /api/user-prefs),
// exactly like `recents` — so it survives refresh and syncs across devices, and
// is replaced wholesale when the next user's prefs load.
//
// ⚠️ BRANCH ISOLATION: every item carries the branch it was parked under. The
// modal always reads the LIVE shell branch, so restoring a chip parked under a
// different branch would silently show the wrong branch's data. The ContextBar
// therefore greys out (disables restore for) chips whose branch ≠ active branch.
// ───────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { usePrefs } from '../prefs';
import { addParked, removeParked, MAX_PARKED, dockId } from './dockCore';

// Pure list ops live in dockCore.js (dependency-free, unit-tested); re-exported
// here so existing importers of `dock` keep working.
export { addParked, removeParked, MAX_PARKED, dockId };

const DockCtx = createContext({ items: [], park: () => {}, unpark: () => {}, clear: () => {} });
export const useDock = () => useContext(DockCtx);

export function DockProvider({ children }) {
  const { prefs, setPref } = usePrefs();
  const items = Array.isArray(prefs.parked) ? prefs.parked : [];

  const park = useCallback((item) => {
    setPref('parked', addParked(Array.isArray(prefs.parked) ? prefs.parked : [], item));
  }, [prefs.parked, setPref]);

  const unpark = useCallback((id) => {
    setPref('parked', removeParked(Array.isArray(prefs.parked) ? prefs.parked : [], id));
  }, [prefs.parked, setPref]);

  const clear = useCallback(() => { setPref('parked', []); }, [setPref]);

  // Never leak one user's parked (branch-scoped) items to the next session.
  useEffect(() => {
    const onGone = () => setPref('parked', []);
    window.addEventListener('kbiz:logout', onGone);
    window.addEventListener('kbiz:auth-expired', onGone);
    return () => { window.removeEventListener('kbiz:logout', onGone); window.removeEventListener('kbiz:auth-expired', onGone); };
  }, [setPref]);

  const value = useMemo(() => ({ items, park, unpark, clear }), [items, park, unpark, clear]);
  return <DockCtx.Provider value={value}>{children}</DockCtx.Provider>;
}
