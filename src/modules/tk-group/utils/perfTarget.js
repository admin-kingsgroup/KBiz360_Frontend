// ─── TK GROUP CENTRAL · performance vs target (pure) ─────────────────────────
// BRANCHWISE — each branch's target vs actual in its own currency; never summed.
import { curSym } from './currency';

export const PERF_METRICS = [
  { key: 'sales', label: 'Sales' },
  { key: 'gp', label: 'Gross Profit' },
  { key: 'collections', label: 'Collections' },
];

/** FY label as the targets endpoint expects, e.g. "2026-27". `now` injected for tests. */
export function fyStr(now) {
  const y = now.getFullYear();
  const s = now.getMonth() >= 3 ? y : y - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
}

/** One branch's target/actual row from a targets-vs-actual payload. */
export function perfTargetRow(branch, tva) {
  // targets-vs-actual returns the group aggregate under `.totals` (target, actual,
  // variance, pct, status) and the per-module breakdown in `.rows` — there is no
  // top-level target/actual, so read from `.totals`.
  const t = (tva && tva.totals) || {};
  const target = Number(t.target) || 0;
  const actual = Number(t.actual) || 0;
  return {
    code: branch.code, cur: curSym(branch.currency), flag: branch.flag, city: branch.city,
    target, actual,
    variance: actual - target,
    achievement: target > 0 ? Math.round((actual / target) * 100) : 0,
  };
}
