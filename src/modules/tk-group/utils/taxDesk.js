// ─── TK GROUP CENTRAL · Tax Desk (pure) ──────────────────────────────────────
// Central statutory oversight. Two parts, each true to its nature:
//   • the org-wide compliance calendar — inherently central (a filing is entity/return
//     level, NOT a sum of branch figures), from /api/tax-calendar/dues; and
//   • a BRANCHWISE filing-status matrix from /api/tax-reconciliation/filing-board.
// Pure & testable; the screen pulls the raw API data.

import { curSym } from './currency';

/** Due value split by currency — "₹… · $…", never blended. Reads `totals.dueByCurrency`
 *  ({INR: n, USD: n}); falls back to the legacy single `dueValue` as ₹ for old payloads.
 *  Returns [{ code, sym, amount }] (empty when nothing is due). */
export function dueValueParts(totals) {
  const by = (totals && totals.dueByCurrency) || null;
  if (by && Object.keys(by).length) {
    return Object.entries(by)
      .filter(([, v]) => Number(v))
      .map(([code, v]) => ({ code, sym: curSym(code), amount: Number(v) || 0 }));
  }
  const v = Number(totals && totals.dueValue) || 0;
  return v ? [{ code: 'INR', sym: '₹', amount: v }] : [];
}

/** Chip tone for a statutory-due status. */
export function dueTone(status) {
  switch (status) {
    case 'Overdue': return 'danger';
    case 'Pending': return 'warning';
    case 'Upcoming': return 'info';
    case 'Filed': return 'success';
    default: return 'neutral';
  }
}

/** KPI cards from the calendar totals — overdue first (most urgent). */
export function calendarKpis(totals) {
  const t = totals || {};
  const n = (k) => Number(t[k]) || 0;
  return [
    { key: 'overdue', label: 'Overdue', value: n('overdue'), tone: 'danger' },
    { key: 'pending', label: 'Due soon', value: n('pending'), tone: 'warning' },
    { key: 'upcoming', label: 'Upcoming', value: n('upcoming'), tone: 'info' },
    { key: 'filed', label: 'Filed', value: n('filed'), tone: 'success' },
  ];
}

/** One branch's filing-status row from a filing-board entity ({ entity, regime, taxes }). */
export function filingRow(entity) {
  const e = entity || {};
  const taxes = e.taxes || {};
  const keys = Object.keys(taxes);
  const filed = keys.filter((k) => taxes[k] && taxes[k].status === 'Filed').length;
  const total = keys.length;
  return {
    code: e.entity, regime: e.regime || '', filed, total,
    pending: total - filed,
    pct: total ? Math.round((filed / total) * 100) : 0,
    taxes,
  };
}

/** Branchwise filing rows, filtered to the focused branch set (codes). Empty/falsy
 *  focus set → every entity the board returned. */
export function filingBranchRows(board, focusCodes) {
  const entities = (board && Array.isArray(board.entities)) ? board.entities : [];
  const set = Array.isArray(focusCodes) && focusCodes.length ? new Set(focusCodes) : null;
  return entities.filter((e) => !set || set.has(e.entity)).map(filingRow);
}

/** Previous calendar month as YYYY-MM — the most-recent fileable period (returns are
 *  filed in arrears), matching the backend's default. JS Date handles the year rollover. */
export function prevMonth(d) {
  const base = d instanceof Date ? d : new Date();
  const p = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
}
