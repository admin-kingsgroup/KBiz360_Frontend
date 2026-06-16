/* ════════════════════════════════════════════════════════════════════
   Finance UI store (Zustand) — UI-ONLY state
   ════════════════════════════════════════════════════════════════════
   Server state (trial balance rows, ledgers, …) lives in TanStack Query and
   must NEVER be put here. This store holds only view preferences: the selected
   period and the detailed/summary toggle for the Trial Balance, etc.
   ──────────────────────────────────────────────────────────────────── */

import { create } from 'zustand';
import { CUR_FY, todayISO } from '../../../core/dates';

export const useFinanceStore = create((set) => ({
  // ─── Trial Balance view state ───
  trialBalance: {
    from: CUR_FY.startISO,   // FY start → opening balance is exact for the period
    to: todayISO(),          // "as on" date for closing balances
    view: 'detailed',        // 'detailed' (opening/movement/closing) | 'summary' (closing only)
  },
  setTrialBalancePeriod: (from, to) =>
    set((s) => ({ trialBalance: { ...s.trialBalance, from, to } })),
  setTrialBalanceView: (view) =>
    set((s) => ({ trialBalance: { ...s.trialBalance, view } })),

  // ─── Voucher-register period override ───
  // null/null → follow the global Financial-Year selector; set → custom range.
  register: { from: null, to: null },
  setRegisterPeriod: (from, to) => set({ register: { from, to } }),
  resetRegisterPeriod: () => set({ register: { from: null, to: null } }),
}));
