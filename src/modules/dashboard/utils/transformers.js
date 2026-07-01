import { FX_TO_INR } from './constants';
import { fmtINR } from '../../../core/format';
import { fmtDate, todayISO } from '../../../core/dates';

// NOTE: the seed-era transforms (computeBranchKpis / computeGpByModule /
// computeConsultantLeaderboard / filterBills* / filterExpensesByBranchMonth) and the
// get-bills.js / get-expenses.js accessors that fed them were removed — they read the
// now-empty GP_BILLS / EXP_ACTUALS seed arrays and had no consumers. The live engine
// equivalents below (gpByModuleFromMpl / consultantsFromSales / countFiles / filesOf)
// replaced them.

/* ── Live (double-entry engine) → dashboard shapes ─────────────────────────
   These map a module-wise P&L payload (GET /api/accounting/module-pl) and the
   sale-voucher list onto the same shapes the seed-driven transformers produced,
   so the KPI tiles, GP-by-module bars and leaderboard render unchanged.        */

// Total booking files across all modules (fileCount already rolls up sub-centres).
export const countFiles = (mpl) =>
  (mpl?.modules || []).reduce((s, m) => s + (m.fileCount || 0), 0);

// Flatten every module's booking files into one list (sub-centred modules nest
// their files under `subs`). Used wherever a per-booking count/avg is needed.
export const filesOf = (mpl) =>
  (mpl?.modules || []).flatMap((m) =>
    m.hasSubs ? (m.subs || []).flatMap((s) => s.files || []) : (m.files || []),
  );

// module-pl `modules` → the { mod, rev, gp, cnt } rows GpByModulePanel expects.
export const gpByModuleFromMpl = (mpl) =>
  (mpl?.modules || [])
    .map((m) => ({ mod: m.name, rev: m.sales || 0, gp: m.gp || 0, cnt: m.fileCount || 0 }))
    .filter((m) => m.rev > 0)
    .sort((a, b) => b.gp - a.gp);

// Sale vouchers grouped by consultant → leaderboard. The engine tracks GP by
// cost-centre, not consultant, so per-consultant GP is estimated by applying the
// period's blended GP% to each consultant's revenue.
export const consultantsFromSales = (saleVouchers, gpPct = 0, limit = 5) => {
  const margin = (Number(gpPct) || 0) / 100;
  const map = {};
  for (const v of saleVouchers || []) {
    const name = v.consultant || 'Unassigned';
    if (!map[name]) map[name] = { name, rev: 0, gp: 0, cnt: 0 };
    const rev = v.subtotal || 0;
    map[name].rev += rev;
    map[name].gp += rev * margin;
    map[name].cnt += 1;
  }
  return Object.values(map)
    .map((c) => ({ ...c, rev: Math.round(c.rev), gp: Math.round(c.gp) }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, limit);
};

/* ── Key Alerts (live) ─────────────────────────────────────────────────────
   Derives the director dashboard's "Key Alerts" from live figures — AR/AP
   ageing, module P&L, net result and customer concentration — instead of a
   static seed list, so the panel surfaces real problems the moment they
   appear. Each alert is { title, type, date, severity, route } where severity
   is 'high' | 'med' | 'low' and route is an in-app report path.              */
const SEV_RANK = { high: 0, med: 1, low: 2 };
// Ageing buckets arrive labelled ("90+ days", "61–90 days" …); match on the
// numeric token so we don't depend on the exact dash/spacing.
const pickBucket = (buckets, test) => (buckets || []).find((b) => test(b.bucket)) || { amount: 0, count: 0 };
const parties = (n) => `${n} ${n === 1 ? 'party' : 'parties'}`;

// `fmtMoney` lets the caller format alert amounts in the active branch's currency
// (USD branches → $). Defaults to ₹ (fmtINR) for back-compat / consolidated views.
export const buildKeyAlerts = ({ arAgeing = [], apAgeing = [], mpl, topCustomers = [], figures = {}, fmtMoney = fmtINR } = {}) => {
  const alerts = [];
  const asOf = fmtDate(todayISO());

  // Receivables: 90+ days is critical, 61–90 is a heads-up.
  const ar90 = pickBucket(arAgeing, (l) => /90\s*\+/.test(l));
  if (ar90.amount > 0)
    alerts.push({ severity: 'high', type: 'Receivables', date: asOf, route: '/reports/rec',
      title: `${fmtMoney(ar90.amount)} receivables overdue 90+ days · ${parties(ar90.count)}` });
  const ar60 = pickBucket(arAgeing, (l) => /^\s*61/.test(l));
  if (ar60.amount > 0)
    alerts.push({ severity: 'med', type: 'Receivables', date: asOf, route: '/reports/rec',
      title: `${fmtMoney(ar60.amount)} receivables ageing 61–90 days · ${parties(ar60.count)}` });

  // Payables we're sitting on past 90 days (supplier-relationship / cash risk).
  const ap90 = pickBucket(apAgeing, (l) => /90\s*\+/.test(l));
  if (ap90.amount > 0)
    alerts.push({ severity: 'med', type: 'Payables', date: asOf, route: '/reports/pay',
      title: `${fmtMoney(ap90.amount)} payables overdue 90+ days · ${parties(ap90.count)}` });

  // Net loss for the selected period.
  if (typeof figures.netProfit === 'number' && figures.netProfit < 0)
    alerts.push({ severity: 'high', type: 'Profitability', date: asOf, route: '/reports/pnl',
      title: `Net loss this period: ${fmtMoney(figures.netProfit)}` });

  // Modules earning revenue but bleeding GP.
  for (const m of gpByModuleFromMpl(mpl))
    if (m.gp < 0)
      alerts.push({ severity: 'high', type: 'Module P&L', date: asOf, route: '/reports/gp',
        title: `${m.mod} running at a loss · ${fmtMoney(m.gp)} GP` });

  // Over-reliance on a single customer.
  const top = topCustomers[0];
  if (top && top.share >= 40)
    alerts.push({ severity: 'med', type: 'Concentration', date: asOf, route: '/reports/concentration',
      title: `Concentration risk: ${top.name} = ${top.share}% of revenue` });

  return alerts.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));
};

export const computeTotalBankBalanceInr = (accounts) =>
  accounts.reduce((sum, acc) => sum + acc.openingBal * (FX_TO_INR[acc.currency] ?? 1), 0);

export const sumVoucherTotals = (vouchersByBranch, key) =>
  Object.values(vouchersByBranch).reduce((s, b) => s + b[key], 0);

// Pure transforms for the LIVE voucher-activity feeds (get-voucher-activity.js).
// Kept here (no I/O) so they are unit-testable without the Vite-only api client.

// Tally today's receipt/payment/journal vouchers per branch — counts AND money.
// Shape: { [branch]: { receipt, payment, journal, total, value } } where `total` is the
// voucher COUNT (receipt+payment+journal) and `value` is the summed money throughput
// (Σ voucher.total). The total/value were previously missing, so callers reading them
// (sumVoucherTotals('total'|'value') → "Posted Today" KPI; the "Total Value" column)
// got NaN / ₹0 even when vouchers existed.
export const tallyVouchersByBranch = (vouchers = []) => {
  const out = {};
  for (const v of vouchers || []) {
    if (!v || !['receipt', 'payment', 'journal'].includes(v.category)) continue;
    const br = v.branch || '—';
    const row = out[br] || (out[br] = { receipt: 0, payment: 0, journal: 0, total: 0, value: 0 });
    row[v.category] += 1;
    row.total += 1;
    row.value += Number(v.total) || 0;
  }
  return out;
};

// Select the dashboard's "Upcoming Travel" rows from live bookings. Prefers bookings
// whose travelDate falls in the next `windowDays` (soonest first); if none carry a
// travelDate yet (legacy data), falls back to the most recent bookings by booking
// date. Pure (today passed in) so it is unit-testable.
export const selectUpcomingTravel = (bookings = [], today, windowDays = 14, limit = 5) => {
  const h = new Date(today + 'T00:00:00'); h.setDate(h.getDate() + windowDays);
  const horizon = h.toISOString().slice(0, 10);
  const upcoming = (bookings || []).filter((b) => b && b.travelDate && b.travelDate >= today && b.travelDate <= horizon);
  const picked = upcoming.length
    ? upcoming.sort((a, b) => String(a.travelDate).localeCompare(String(b.travelDate)))           // soonest first
    : (bookings || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))); // fallback: recent
  return picked.slice(0, limit).map((b) => ({
    id: b.id || b._id || b.bookingNo || b.linkNo,
    client: (b.customer && b.customer.name) || b.customer || 'Client',
    destination: b.headerRef || '',
    mod: b.module || '',
    travelDate: b.travelDate || b.date || '',
    pax: Array.isArray(b.rows) ? b.rows.length : 1,
  }));
};

// Map recent vouchers to the activity-feed shape { action, amount, vendor, ts }.
export const vouchersToActivity = (vouchers = [], limit = 8) => {
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  return (vouchers || [])
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, limit)
    .map((v) => ({
      action: `${cap(v.category)} ${v.vno || ''}`.trim(),
      amount: Number(v.total) || 0,
      vendor: v.party || v.branch || '',
      ts: v.date || '',
    }));
};
