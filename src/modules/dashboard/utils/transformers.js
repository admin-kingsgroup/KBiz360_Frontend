import { PRODUCT_MODULES, FX_TO_INR } from './constants';

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

export const computeTotalBankBalanceInr = (accounts) =>
  accounts.reduce((sum, acc) => sum + acc.openingBal * (FX_TO_INR[acc.currency] ?? 1), 0);

export const sumVoucherTotals = (vouchersByBranch, key) =>
  Object.values(vouchersByBranch).reduce((s, b) => s + b[key], 0);
