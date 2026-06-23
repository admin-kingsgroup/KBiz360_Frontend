import { apiGet } from '../../../core/api';
import { isBankRow } from '../../../core/ledgerKind';
import { CUR_MONTH } from '../../../core/dates';

/**
 * Finance-snapshot data access.
 *
 * LIVE (Phase 1, from the double-entry engine — sales/purchase registers):
 *   getRevenueTrend, getTopCustomers, getTopSuppliers
 * DEMO (Phase 2 — need new backend endpoints: ageing, forecast, targets, recon):
 *   the rest still return seed constants until those endpoints land.
 *
 * Live readers fall back to an empty result on any error so one slow/failed
 * call never blanks the whole dashboard.
 */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Tolerant YYYY-MM extraction (Tally dates arrive ISO or as DD-Mon-YY etc.).
function ym(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(+iso[2]).padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const monthLabel = (k) => { const [y, m] = k.split('-'); return `${MON[+m - 1]} ${String(y).slice(2)}`; };

// Revenue trend → last 12 months of sales (taxable value), with same-month-last-year.
export const getRevenueTrend = async (branchCode) => {
  try {
    // Only the last ~24 months are ever rendered (12 months + same-month-last-year)
    // and only date+subtotal are summed → bound the range and project to those two
    // fields so we never pull the whole voucher history (with line payloads).
    const now = new Date();
    const from = `${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const sales = await apiGet('/api/vouchers', { category: 'sale', branch: branchCode, from, fields: 'date,subtotal' });
    const byMonth = {};
    for (const v of sales || []) { const k = ym(v.date); if (k) byMonth[k] = (byMonth[k] || 0) + (v.subtotal || 0); }
    const months = Object.keys(byMonth).sort();
    return months.slice(-12).map((k) => {
      const [y, m] = k.split('-');
      return { month: monthLabel(k), cy: Math.round(byMonth[k]), ly: Math.round(byMonth[`${+y - 1}-${m}`] || 0) };
    });
  } catch { return []; }
};

// Ranked parties by taxable value — superset shape so the table resolves whatever
// valueKey/countKey it's configured with (customer or supplier).
const topEntities = async (category, branchCode) => {
  try {
    // Same rows + same ranking, but project to only the summed fields so the heavy
    // lines[]/meta payload never crosses the wire (was fetching every full voucher).
    const rows = await apiGet('/api/vouchers', { category, branch: branchCode, fields: 'date,subtotal,party,branch' });
    const map = {};
    for (const v of rows || []) {
      const name = v.party || '—';
      if (!map[name]) map[name] = { name, branch: v.branch || '', value: 0, count: 0 };
      map[name].value += v.subtotal || 0;
      map[name].count += 1;
    }
    const all = Object.values(map);
    const grand = all.reduce((s, r) => s + r.value, 0);
    return all.sort((a, b) => b.value - a.value).slice(0, 8).map((r) => ({
      name: r.name, branch: r.branch,
      revenue: Math.round(r.value), purchases: Math.round(r.value), spend: Math.round(r.value), value: Math.round(r.value),
      bookings: r.count, vouchers: r.count, count: r.count,
      share: grand > 0 ? +((r.value / grand) * 100).toFixed(1) : 0,
    }));
  } catch { return []; }
};
export const getTopCustomers = async (branchCode) => topEntities('sale', branchCode);
export const getTopSuppliers = async (branchCode) => topEntities('purchase', branchCode);

// AR / AP ageing buckets (live, bill-wise / no FIFO) → the shape AgeingBuckets renders.
const BUCKET_META = [
  ['d0', '0–30 days', '#16a34a'],
  ['d30', '31–60 days', '#d97706'],
  ['d60', '61–90 days', '#dc2626'],
  ['d90', '90+ days', '#6b1010'],
];
const ageingSide = async (sideKey, branchCode) => {
  try {
    // Branch-scope the ageing call (every sibling dashboard call passes branch); without
    // it the AR/AP buckets show consolidated all-branch data mixed with branch KPIs.
    const d = await apiGet('/api/accounting/ageing', { branch: branchCode });
    const sd = d && d[sideKey];
    if (!sd) return [];
    const rows = sd.rows || [], totals = sd.totals || {};
    return BUCKET_META.map(([k, bucket, color]) => ({
      bucket, color,
      amount: Math.round(totals[k] || 0),
      count: rows.filter((r) => (r[k] || 0) > 0).length,
    }));
  } catch { return []; }
};
export const getArAgeingSummary = async (branchCode) => ageingSide('receivables', branchCode);
export const getApAgeingSummary = async (branchCode) => ageingSide('payables', branchCode);

// ── LIVE (Phase 2 wiring) ───────────────────────────────────────────────────
// Recent variance flags — live from indirect-expense budget vs actual. Over-budget
// ledgers become the SR-FM "Recent Variance Flags" panel. Shape the widget needs:
// { account, pct, variance, branch, date }.
export const getVarianceFlags = async (branchCode) => {
  try {
    const d = await apiGet('/api/accounting/budget-vs-actual', { branch: branchCode });
    const today = new Date().toISOString().slice(0, 10);
    return (d?.rows || [])
      .filter((r) => (r.actual || 0) > (r.budget || 0)) // only overruns are "flags"
      .map((r) => {
        const over = Math.round((r.actual || 0) - (r.budget || 0));
        return { account: r.name, variance: over, pct: r.budget ? Math.round((over / r.budget) * 100) : 0, branch: branchCode || 'All', date: today };
      })
      .sort((a, b) => b.variance - a.variance);
  } catch { return []; }
};

// Bank reconciliation status — live: one summary per active bank ledger, mapped to
// the panel's { bank, status, matched, unmatched }. 'Clean' (green) when nothing is
// unreconciled, 'Behind' (red) when there's an open backlog (see statusColor()).
export const getReconStatus = async (branchCode) => {
  try {
    const ledgers = await apiGet('/api/bank-reconciliation/ledgers', { branch: branchCode });
    const list = Array.isArray(ledgers) ? ledgers : [];
    return await Promise.all(list.map(async (lg) => {
      try {
        const s = await apiGet('/api/bank-reconciliation/summary', { ledger: lg.name, branch: branchCode });
        const c = s?.counts || {};
        const matched = (c.statementReconciled || 0) + (c.statementPartial || 0);
        const unmatched = (c.statementUnreconciled || 0) + (c.statementException || 0);
        const status = unmatched > 0 ? 'Behind' : (matched > 0 ? 'Clean' : 'Pending');
        return { bank: lg.name, status, matched, unmatched };
      } catch { return { bank: lg.name, status: 'Pending', matched: 0, unmatched: 0 }; }
    }));
  } catch { return []; }
};

// Bank balances — live: each Bank-group ledger's closing balance from the Trial
// Balance (branch-scoped). Mapped to the BankBalancesPanel shape
// { id, bank, branch, accountNo, currency, openingBal, limit }; openingBal carries
// the live closing balance (Dr − Cr) so the "Banks Balance Total" KPI is real.
export const getBankAccounts = async (branchCode) => {
  try {
    const d = await apiGet('/api/accounting/trial-balance', { branch: branchCode });
    return (d?.rows || [])
      .filter((r) => isBankRow(r))
      .map((r) => ({
        id: r.ledger,
        bank: r.ledger,
        branch: branchCode || 'All',
        accountNo: '',
        currency: '₹',
        openingBal: Math.round((r.closingDebit || 0) - (r.closingCredit || 0)),
        limit: 0,
      }))
      .sort((a, b) => b.openingBal - a.openingBal);
  } catch { return []; }
};

// Branch × month GP heatmap — live (GET /api/accounting/branch-heatmap). Each row
// { branch, cells:[{month, rev, gp}] } drives the Director heatmap shading (GP%).
export const getBranchHeatmap = async (fy) => {
  try {
    const d = await apiGet('/api/accounting/branch-heatmap', { fy });
    return d?.rows || [];
  } catch { return []; }
};

// 13-week cash-flow forecast — live (GET /api/accounting/cash-forecast). Returns
// [{ week, inflow, outflow, closing }] derived from open AR/AP bills' due dates.
export const getCashForecast = async (branchCode) => {
  try {
    const d = await apiGet('/api/accounting/cash-forecast', { branch: branchCode });
    return d?.rows || [];
  } catch { return []; }
};

// Period-close status per branch — LIVE, derived from the books. There is no
// dedicated period-lock subsystem, so the one signal we can know for certain is
// whether the branch still has unposted (pending) vouchers this month: zero pending
// ⇒ every entry is posted, so the period is effectively closed from a data-entry
// standpoint. tbClosed/reconciled/approved all reflect that same real signal — never
// a fabricated tick. (When a true month-end-lock subsystem lands, source it here.)
export const getPeriodClose = async () => {
  try {
    const [branches, pending] = await Promise.all([
      apiGet('/api/branches'),
      apiGet('/api/vouchers', { status: 'pending', from: `${CUR_MONTH}-01`, to: `${CUR_MONTH}-31` }),
    ]);
    const pendingByBr = {};
    for (const v of (pending || [])) pendingByBr[v.branch] = (pendingByBr[v.branch] || 0) + 1;
    return (branches || [])
      .filter((b) => b && b.code && b.active !== false)
      .map((b) => {
        const done = !(pendingByBr[b.code] > 0); // no pending vouchers ⇒ all posted
        return { branch: b.code, tbClosed: done, reconciled: done, approved: done, status: done ? 'Closed' : 'Open' };
      });
  } catch { return []; }
};
