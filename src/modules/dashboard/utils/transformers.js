import { PRODUCT_MODULES, FX_TO_INR } from './constants';
import { fmtINR } from '../../../core/format';
import { fmtDate, todayISO } from '../../../core/dates';

export const filterBillsByBranchPeriod = (bills, branchCode, monthPrefix) =>
  bills.filter(
    (b) => (!branchCode || b.branch === branchCode) && b.date.startsWith(monthPrefix),
  );

export const filterBillsFromDate = (bills, branchCode, fromDate) =>
  bills.filter(
    (b) => (!branchCode || b.branch === branchCode) && b.date >= fromDate,
  );

export const filterExpensesByBranchMonth = (expenses, branchCode, month) =>
  expenses.filter((a) => (!branchCode || a.br === branchCode) && a.m === month);

export const computeBranchKpis = (bills) => {
  const revenue = bills.reduce((s, b) => s + b.sell, 0);
  const cost = bills.reduce((s, b) => s + b.cost, 0);
  const gp = revenue - cost;
  return {
    revenue,
    cost,
    gp,
    gpPct: revenue > 0 ? +((gp / revenue) * 100).toFixed(1) : 0,
    bookings: bills.length,
  };
};

export const computeGpByModule = (bills, totalGp) =>
  PRODUCT_MODULES.map((mod) => {
    const modBills = bills.filter((b) => b.mod === mod);
    return {
      mod,
      rev: modBills.reduce((s, b) => s + b.sell, 0),
      gp: modBills.reduce((s, b) => s + b.sell - b.cost, 0),
      cnt: modBills.length,
    };
  })
    .filter((m) => m.rev > 0)
    .sort((a, b) => b.gp - a.gp);

export const computeConsultantLeaderboard = (bills, limit = 5) => {
  const map = {};
  bills.forEach((b) => {
    if (!map[b.consultant]) map[b.consultant] = { name: b.consultant, rev: 0, gp: 0, cnt: 0 };
    map[b.consultant].rev += b.sell;
    map[b.consultant].gp += b.sell - b.cost;
    map[b.consultant].cnt += 1;
  });
  return Object.values(map).sort((a, b) => b.gp - a.gp).slice(0, limit);
};

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

export const buildKeyAlerts = ({ arAgeing = [], apAgeing = [], mpl, topCustomers = [], figures = {} } = {}) => {
  const alerts = [];
  const asOf = fmtDate(todayISO());

  // Receivables: 90+ days is critical, 61–90 is a heads-up.
  const ar90 = pickBucket(arAgeing, (l) => /90\s*\+/.test(l));
  if (ar90.amount > 0)
    alerts.push({ severity: 'high', type: 'Receivables', date: asOf, route: '/reports/rec',
      title: `${fmtINR(ar90.amount)} receivables overdue 90+ days · ${parties(ar90.count)}` });
  const ar60 = pickBucket(arAgeing, (l) => /^\s*61/.test(l));
  if (ar60.amount > 0)
    alerts.push({ severity: 'med', type: 'Receivables', date: asOf, route: '/reports/rec',
      title: `${fmtINR(ar60.amount)} receivables ageing 61–90 days · ${parties(ar60.count)}` });

  // Payables we're sitting on past 90 days (supplier-relationship / cash risk).
  const ap90 = pickBucket(apAgeing, (l) => /90\s*\+/.test(l));
  if (ap90.amount > 0)
    alerts.push({ severity: 'med', type: 'Payables', date: asOf, route: '/reports/pay',
      title: `${fmtINR(ap90.amount)} payables overdue 90+ days · ${parties(ap90.count)}` });

  // Net loss for the selected period.
  if (typeof figures.netProfit === 'number' && figures.netProfit < 0)
    alerts.push({ severity: 'high', type: 'Profitability', date: asOf, route: '/reports/pnl',
      title: `Net loss this period: ${fmtINR(figures.netProfit)}` });

  // Modules earning revenue but bleeding GP.
  for (const m of gpByModuleFromMpl(mpl))
    if (m.gp < 0)
      alerts.push({ severity: 'high', type: 'Module P&L', date: asOf, route: '/reports/gp',
        title: `${m.mod} running at a loss · ${fmtINR(m.gp)} GP` });

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
