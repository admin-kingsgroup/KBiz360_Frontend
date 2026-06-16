/* ════════════════════════════════════════════════════════════════════
   Financial-Year store (Zustand) — global UI scope
   ════════════════════════════════════════════════════════════════════
   Holds the financial year selected in the app-bar FY picker. This is the
   companion to the company (branch) selector — the two global ERP scopes.
   It persists to localStorage so a refresh keeps the chosen FY.

   Pages read `useFyStore(s => s.fy)` and pass its `from`/`to` into their data
   hooks. UI-only state — never server data.
   ──────────────────────────────────────────────────────────────────── */

import { create } from 'zustand';
import { CUR_FY } from '../core/dates';

// Indian FY label for a start year: 2025 → "2025-26".
const labelFor = (startYear) => `${startYear}-${String(startYear + 1).slice(-2)}`;
const isoFor = (startYear) => ({
  startYear,
  label: labelFor(startYear),
  startISO: `${startYear}-04-01`,
  endISO: `${startYear + 1}-03-31`,
});

// Current FY + the previous 4, newest first.
export const FY_OPTIONS = Array.from({ length: 5 }, (_, i) => isoFor(CUR_FY.startYear - i));

const STORAGE_KEY = 'kb360-fy';
const initialStartYear = (() => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (saved && FY_OPTIONS.some((o) => o.startYear === saved)) return saved;
  } catch { /* ignore */ }
  return CUR_FY.startYear;
})();

export const useFyStore = create((set) => ({
  fy: isoFor(initialStartYear),
  setFy: (startYear) => {
    try { localStorage.setItem(STORAGE_KEY, String(startYear)); } catch { /* ignore */ }
    set({ fy: isoFor(startYear) });
  },
}));
