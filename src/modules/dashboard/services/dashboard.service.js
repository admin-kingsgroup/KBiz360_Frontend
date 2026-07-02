import * as api from '../api';
import {
  countFiles,
  filesOf,
  gpByModuleFromMpl,
  consultantsFromSales,
  buildKeyAlerts,
} from '../utils/transformers';
import { growthPct } from '../utils/helpers';
import { bc } from '../../../core/styleTokens';
import { compactAmt } from '../../../core/format';

// Branch-aware compact money for alert text ($ for NBO/DAR/FBM, ₹ otherwise).
const moneyFor = (branchCode) => {
  const cur = (bc({ code: branchCode }) || {}).cur || '₹';
  return (n) => compactAmt(n, { currency: cur });
};

/**
 * Dashboard service — the only place that orchestrates `api/*` accessors and
 * domain transformers. Hooks should call into the service, not the api layer
 * directly, so business logic stays out of React.
 *
 * Figures are sourced LIVE from the double-entry engine (module-wise P&L +
 * ageing), the same source as Reports → P&L / Balance Sheet — replacing the old
 * empty seed arrays that made every KPI render as zero.
 */

export const loadBranchDashboard = async ({ branchCode }) => {
  const p = api.periods();
  const [cur, prev, ytd, unsettled, saleVouchers, actionItems, upcomingTravel, bookingSummary] = await Promise.all([
    api.getModulePL({ branchCode, ...p.month }),
    api.getModulePL({ branchCode, ...p.prevMonth }),
    api.getModulePL({ branchCode, ...p.ytd }),
    api.getAgeingTotals(branchCode),
    api.getSaleVouchers({ branchCode, ...p.month }),
    api.getActionItems(branchCode),
    api.getUpcomingTravel({ limit: 5, branchCode }),
    api.getBookingSummary(branchCode), // SO/PO/GP pipeline { pending, approved } (whole queue, not date-bound)
  ]);

  return {
    billsYtd: filesOf(ytd),
    actionItems,
    upcomingTravel,
    pendingBookings: bookingSummary.pending,
    approvedBookings: bookingSummary.approved,
    rejectedBookings: bookingSummary.rejected,
    deletedBookings: bookingSummary.deleted,
    bookingsByBranch: bookingSummary.byBranch || null, // per-branch SO/PO/GP pipeline (consolidated only)
    kpis: {
      revenue: cur.totals.sales,
      cost: cur.totals.cogs,
      gp: cur.totals.gp,
      gpPct: cur.totals.gpPct,
      bookings: countFiles(cur),
      netProfit: cur.bridge.netProfit,
      expenses: cur.indirect.expense,
      revenueGrowth: growthPct(cur.totals.sales, prev.totals.sales),
      gpGrowth: growthPct(cur.totals.gp, prev.totals.gp),
      outstanding: unsettled.receivable,  // unsettled receivable (pending to collect)
      payable: unsettled.payable,         // unsettled payable (pending to pay)
      ytdRevenue: ytd.totals.sales,
      ytdGp: ytd.totals.gp,
      ytdBookings: countFiles(ytd),
    },
    gpByModule: gpByModuleFromMpl(cur),
    topConsultants: consultantsFromSales(saleVouchers, cur.totals.gpPct),
  };
};

export const loadDirectorDashboard = async ({ range = 'month', branchCode, from, to } = {}) => {
  // Prefer explicit from/to (uniform 7-preset bar); fall back to the legacy range preset.
  const dates = (from != null || to != null) ? { from: from || '', to: to || '', label: 'Custom' } : api.rangeToDates(range);
  // NOTE: FY targets and the branch heatmap are rendered LIVE by the page itself
  // (useTargetsVsActual + per-branch module-pl), so we no longer fetch the seed
  // getFyTargets() or getBranchHeatmap() here — they were unused round-trips.
  const [revenueTrend, topCustomers, topSuppliers, bankAccounts, mpl, unsettled, cash, arAgeing, apAgeing, bookingSummary, saleVouchers, salesRecon, gpRecon] =
    await Promise.all([
      api.getRevenueTrend(branchCode),
      api.getTopCustomers(branchCode),
      api.getTopSuppliers(branchCode),
      api.getBankAccounts(branchCode),
      api.getModulePL({ branchCode, from: dates.from, to: dates.to, summary: true }), // live, period + scope driven (totals/bridge only → summary)
      api.getAgeingTotals(branchCode),
      api.getCashPosition(branchCode),
      api.getArAgeingSummary(branchCode),  // branch-scoped: an all-scope Director who selects a
      api.getApAgeingSummary(branchCode),  // branch isn't auto-coerced server-side — must pass it
      api.getBookingSummary(branchCode), // SO/PO/GP pipeline { pending, approved } (not date-bound — whole queue)
      api.getSaleVouchers({ branchCode, from: dates.from, to: dates.to }), // for the consultant leaderboard (Director ops view)
      api.getSalesReconciliation({ branchCode, from: dates.from, to: dates.to }), // Revenue = SO/PO/GP + INB − Refund (+Other); foots to the Revenue KPI
      api.getGpReconciliation({ branchCode, from: dates.from, to: dates.to }), // GP = SO/PO/GP + INB + Refund + Commission/Adj (+Other); foots to the GP KPI
    ]);

  // Key Alerts are computed live from ageing + module P&L + concentration, not seeded.
  const keyAlerts = buildKeyAlerts({
    arAgeing, apAgeing, mpl, topCustomers,
    figures: { netProfit: mpl?.bridge?.netProfit, gpPct: mpl?.totals?.gpPct },
    fmtMoney: moneyFor(branchCode),
  });

  return {
    revenueTrend, keyAlerts, topCustomers, topSuppliers, bankAccounts,
    topConsultants: consultantsFromSales(saleVouchers, mpl?.totals?.gpPct), // team performance (Director)
    pendingBookings: bookingSummary.pending,
    approvedBookings: bookingSummary.approved,
    rejectedBookings: bookingSummary.rejected,
    deletedBookings: bookingSummary.deleted,
    bookingsByBranch: bookingSummary.byBranch || null, // per-branch SO/PO/GP pipeline (consolidated only)
    salesRecon, // Revenue-by-origin bridge (SO/PO/GP + INB − Refund + Other); foots to figures.revenue
    gpRecon,    // GP-by-origin bridge (SO/PO/GP + INB + Refund + Commission/Adj + Other); foots to figures.gp
    rangeLabel: dates.label,
    figures: {
      revenue: mpl.totals.sales,
      purchase: mpl.totals.cogs,        // Actual Purchase (COGS) from the books
      gp: mpl.totals.gp,
      gpPct: mpl.totals.gpPct,
      expenses: mpl.indirect.expense,   // Actual indirect Expenses from the books
      netProfit: mpl.bridge.netProfit,
      outstanding: unsettled.receivable,  // unsettled receivable (pending to collect)
      payable: unsettled.payable,         // unsettled payable (pending to pay)
      cash,
    },
    // back-compat: anything still reading data.mtd gets the selected-period figures
    mtd: { revenue: mpl.totals.sales, gp: mpl.totals.gp },
  };
};

export const loadSrFmDashboard = async ({ branchCode } = {}) => {
  const [cashForecast, bankAccounts, periodClose, arAgeing, apAgeing, varianceFlags, gstrFiling] =
    await Promise.all([
      api.getCashForecast(branchCode),
      api.getBankAccounts(branchCode),
      api.getPeriodClose(branchCode),
      api.getArAgeingSummary(branchCode),
      api.getApAgeingSummary(branchCode),
      api.getVarianceFlags(branchCode),
      api.getGstrFiling(branchCode),
    ]);

  return { cashForecast, bankAccounts, periodClose, arAgeing, apAgeing, varianceFlags, gstrFiling };
};

export const loadSrAeDashboard = async ({ branchCode } = {}) => {
  const [todayVouchers, reconStatus, topVendorsOverdue] = await Promise.all([
    api.getTodayVouchersByBranch(branchCode),
    api.getReconStatus(branchCode),
    api.getTopVendorsOverdue(branchCode),
  ]);

  return { todayVouchers, reconStatus, topVendorsOverdue };
};

export const loadAcctsExecDashboard = async ({ branchCode } = {}) => {
  const [todayVouchers, recentActivity, arAgeing, apAgeing, weekStats] = await Promise.all([
    api.getTodayVouchersByBranch(branchCode),
    api.getRecentActivity(branchCode),
    api.getArAgeingSummary(branchCode),
    api.getApAgeingSummary(branchCode),   // Open Payables KPI (gross payable outstanding)
    api.getWeekVoucherStats(branchCode),  // Receipts This Week KPI (7-day receipt count)
  ]);

  return { todayVouchers, recentActivity, arAgeing, apAgeing, weekStats };
};

export const loadHrMgrDashboard = async ({ branchCode } = {}) => api.getHrStats(branchCode);
