/* ════════════════════════════════════════════════════════════════════
   Cockpit branch-Focus store (Zustand) — the in-cockpit spotlight
   ════════════════════════════════════════════════════════════════════
   The top selector holds the MODE (TK Group Central). This holds FOCUS —
   which branch a central user is scrutinising inside the cockpit, or ALL
   (branchwise). It is the companion to useFyStore / the branch selector.

   The FocusSwitcher (shell) writes it; cockpit oversight pages read
   `effectiveScope(focus)` to scope their /api/tk/* queries — branchwise
   when ALL, a single branch when focused. UI-only state; never server data.

   Hydration is deferred: at module-init the branch list may not be known, so
   `focus` starts ALL and the FocusSwitcher calls initFocus(codes) once on
   mount to restore from ?focus= (URL wins) or localStorage — both validated
   against the codes the user may actually see (out-of-scope → ALL).
   ──────────────────────────────────────────────────────────────────── */

import { create } from 'zustand';
import {
  FOCUS_ALL, normalizeFocus, loadFocus, saveFocus, parseFocusParam,
} from '../modules/tk-group/utils/cockpitFocus';

function search() {
  try { return typeof window !== 'undefined' && window.location ? window.location.search : ''; }
  catch { return ''; }
}

export const useCockpitFocusStore = create((set, get) => ({
  focus: FOCUS_ALL,
  hydrated: false,

  // Restore once from URL (shareable link wins) then last-saved. Idempotent.
  initFocus: (validCodes = []) => {
    if (get().hydrated) return;
    let f = parseFocusParam(search(), validCodes);
    if (f === FOCUS_ALL) f = loadFocus(validCodes);
    set({ focus: f, hydrated: true });
  },

  // Set + persist. Always normalized against the codes the user may see.
  setFocus: (code, validCodes = []) => {
    const f = normalizeFocus(code, validCodes);
    saveFocus(f);
    set({ focus: f });
  },

  // Back to branchwise (e.g. on leaving the cockpit). Clears storage residue.
  resetFocus: () => { saveFocus(FOCUS_ALL); set({ focus: FOCUS_ALL }); },
}));

/** Convenience read hook — the single value oversight pages care about. */
export const useCockpitFocus = () => useCockpitFocusStore((s) => s.focus);
