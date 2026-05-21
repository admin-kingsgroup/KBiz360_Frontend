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

export const computeTotalBankBalanceInr = (accounts) =>
  accounts.reduce((sum, acc) => sum + acc.openingBal * (FX_TO_INR[acc.currency] ?? 1), 0);

export const sumVoucherTotals = (vouchersByBranch, key) =>
  Object.values(vouchersByBranch).reduce((s, b) => s + b[key], 0);
