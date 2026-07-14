/* ════════════════════════════════════════════════════════════════════
   INTER-BRANCH SHARED UTILITIES
   ────────────────────────────────────────────────────────────────────
   isInterBranch / brName are used across several business modules
   (bookingOrder, approvals, reports) — kept here as shared utilities.
   RPT_InterbranchElim (the Inter-Branch Elimination Report) moved to
   modules/reports/financial-statements/interbranchElimination.jsx
   (business sub-module reorg, matching MENU_REPORTS ▸ Financial
   Statements ▸ "Inter-branch Elimination").
   ════════════════════════════════════════════════════════════════════ */

import { BRANCHES } from '../../core/data';

/* ── inter-branch ledger detector ──────────────────────────────────────
   Only fires INSIDE the Sundry Debtors / Sundry Creditors groups (checked
   by the caller), so false positives are unlikely. Recognises the common
   Tally naming styles plus any "<Branch>/<City> Branch" control account. */
const IB_KEYWORDS = /inter[\s\-/]?branch|branch\s*a\/?c|branch\s*current|due\s+(to|from)|head\s*office\s*(current|a\/?c)|h\.?o\.?\s*current/i;
export function isInterBranch(name) {
  const n = name || '';
  if (IB_KEYWORDS.test(n)) return true;
  if (/branch/i.test(n)) {
    const low = n.toLowerCase();
    return BRANCHES.some((b) => low.includes(String(b.code).toLowerCase()) || (b.city && low.includes(String(b.city).toLowerCase())));
  }
  return false;
}

export const brName = (code) => {
  const b = BRANCHES.find((x) => x.code === code);
  return b ? `${b.code} · ${b.city}` : (code || '—');
};
