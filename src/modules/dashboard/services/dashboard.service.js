import * as api from '../api';
import {
  countFiles,
  filesOf,
  gpByModuleFromMpl,
  consultantsFromSales,
  buildKeyAlerts,
} from '../utils/transformers';
import { growthPct } from '../utils/helpers';

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
    api.getActionItems(),
    api.getUpcomingTravel({ limit: 5 }),
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
  const [revenueTrend, fyTargets, branchHeatmap, topCustomers, topSuppliers, bankAccounts, mpl, unsettled, cash, arAgeing, apAgeing, bookingSummary] =
    await Promise.all([
      api.getRevenueTrend(branchCode),
      api.getFyTargets(),
      api.getBranchHeatmap(),
      api.getTopCustomers(branchCode),
      api.getTopSuppliers(branchCode),
      api.getBankAccounts(branchCode),
      api.getModulePL({ branchCode, from: dates.from, to: dates.to }), // live, period + scope driven
      api.getAgeingTotals(branchCode),
      api.getCashPosition(branchCode),
      api.getArAgeingSummary(branchCode),  // branch-scoped: an all-scope Director who selects a
      api.getApAgeingSummary(branchCode),  // branch isn't auto-coerced server-side — must pass it
      api.getBookingSummary(branchCode), // SO/PO/GP pipeline { pending, approved } (not date-bound — whole queue)
    ]);

  // Key Alerts are computed live from ageing + module P&L + concentration, not seeded.
  const keyAlerts = buildKeyAlerts({
    arAgeing, apAgeing, mpl, topCustomers,
    figures: { netProfit: mpl?.bridge?.netProfit, gpPct: mpl?.totals?.gpPct },
  });

  return {
    revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers, bankAccounts,
    pendingBookings: bookingSummary.pending,
    approvedBookings: bookingSummary.approved,
    rejectedBookings: bookingSummary.rejected,
    deletedBookings: bookingSummary.deleted,
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

export const loadSrFmDashboard = async () => {
  const [cashForecast, bankAccounts, periodClose, arAgeing, apAgeing, varianceFlags] =
    await Promise.all([
      api.getCashForecast(),
      api.getBankAccounts(),
      api.getPeriodClose(),
      api.getArAgeingSummary(),
      api.getApAgeingSummary(),
      api.getVarianceFlags(),
    ]);

  return { cashForecast, bankAccounts, periodClose, arAgeing, apAgeing, varianceFlags };
};

export const loadSrAeDashboard = async () => {
  const [todayVouchers, reconStatus, topSuppliers] = await Promise.all([
    api.getTodayVouchersByBranch(),
    api.getReconStatus(),
    api.getTopSuppliers(),
  ]);

  return { todayVouchers, reconStatus, topSuppliers };
};

export const loadAcctsExecDashboard = async ({ branchCode } = {}) => {
  const [todayVouchers, recentActivity, arAgeing] = await Promise.all([
    api.getTodayVouchersByBranch(),
    api.getRecentActivity(),
    api.getArAgeingSummary(branchCode),
  ]);

  return { todayVouchers, recentActivity, arAgeing };
};

export const loadHrMgrDashboard = async () => api.getHrStats();
