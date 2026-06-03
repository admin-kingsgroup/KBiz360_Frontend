import {
  BANK_ACCOUNTS_DATA,
  BRANCH_PL_HEATMAP,
  PERIOD_CLOSE_DATA,
  RECON_STATUS_DATA,
  VARIANCE_FLAGS_DATA,
} from '../../../core/helpers';
import {
  CASH_FORECAST_13W,
  FY_TARGETS_DATA,
  KEY_ALERTS_DATA,
} from '../../../core/data';
import { apiGet } from '../../../core/api';

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
export const getRevenueTrend = async () => {
  try {
    const sales = await apiGet('/api/vouchers', { category: 'sale' });
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
const topEntities = async (category) => {
  try {
    const rows = await apiGet('/api/vouchers', { category });
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
      revenue: Math.round(r.value), purchases: Math.round(r.value), value: Math.round(r.value),
      bookings: r.count, vouchers: r.count, count: r.count,
      share: grand > 0 ? +((r.value / grand) * 100).toFixed(1) : 0,
    }));
  } catch { return []; }
};
export const getTopCustomers = async () => topEntities('sale');
export const getTopSuppliers = async () => topEntities('purchase');

// AR / AP ageing buckets (live, FIFO) → the shape AgeingBuckets renders.
const BUCKET_META = [
  ['d0', '0–30 days', '#27500A'],
  ['d30', '31–60 days', '#854F0B'],
  ['d60', '61–90 days', '#A32D2D'],
  ['d90', '90+ days', '#6b1010'],
];
const ageingSide = async (sideKey) => {
  try {
    const d = await apiGet('/api/accounting/ageing');
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
export const getArAgeingSummary = async () => ageingSide('receivables');
export const getApAgeingSummary = async () => ageingSide('payables');

// ── Phase 2 (need new backend endpoints) — still seed data for now ──────────
export const getBankAccounts = async () => BANK_ACCOUNTS_DATA;
export const getFyTargets = async () => FY_TARGETS_DATA;
export const getBranchHeatmap = async () => BRANCH_PL_HEATMAP;
export const getKeyAlerts = async () => KEY_ALERTS_DATA;
export const getCashForecast = async () => CASH_FORECAST_13W;
export const getPeriodClose = async () => PERIOD_CLOSE_DATA;
export const getReconStatus = async () => RECON_STATUS_DATA;
export const getVarianceFlags = async () => VARIANCE_FLAGS_DATA;
