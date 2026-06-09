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
  const [cur, prev, ytd, unsettled, saleVouchers, actionItems, upcomingTravel] = await Promise.all([
    api.getModulePL({ branchCode, ...p.month }),
    api.getModulePL({ branchCode, ...p.prevMonth }),
    api.getModulePL({ branchCode, ...p.ytd }),
    api.getAgeingTotals(branchCode),
    api.getSaleVouchers({ branchCode, ...p.month }),
    api.getActionItems(),
    api.getUpcomingTravel({ limit: 5 }),
  ]);

  return {
    billsYtd: filesOf(ytd),
    actionItems,
    upcomingTravel,
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

export const loadDirectorDashboard = async ({ range = 'month', branchCode } = {}) => {
  const dates = api.rangeToDates(range); // 'month' | 'ytd' | 'all' → ISO range + label
  const [revenueTrend, fyTargets, branchHeatmap, topCustomers, topSuppliers, bankAccounts, mpl, unsettled, cash, arAgeing, apAgeing, pendingBookings] =
    await Promise.all([
      api.getRevenueTrend(branchCode),
      api.getFyTargets(),
      api.getBranchHeatmap(),
      api.getTopCustomers(branchCode),
      api.getTopSuppliers(branchCode),
      api.getBankAccounts(),
      api.getModulePL({ branchCode, from: dates.from, to: dates.to }), // live, period + scope driven
      api.getAgeingTotals(branchCode),
      api.getCashPosition(branchCode),
      api.getArAgeingSummary(),
      api.getApAgeingSummary(),
      api.getPendingBookingSummary(branchCode), // pending SO/PO/GP pipeline (not date-bound — whole queue)
    ]);

  // Key Alerts are computed live from ageing + module P&L + concentration, not seeded.
  const keyAlerts = buildKeyAlerts({
    arAgeing, apAgeing, mpl, topCustomers,
    figures: { netProfit: mpl?.bridge?.netProfit, gpPct: mpl?.totals?.gpPct },
  });

  return {
    revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers, bankAccounts,
    pendingBookings,
    rangeLabel: dates.label,
    figures: {
      revenue: mpl.totals.sales,
      gp: mpl.totals.gp,
      gpPct: mpl.totals.gpPct,
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

export const loadAcctsExecDashboard = async () => {
  const [todayVouchers, recentActivity, arAgeing] = await Promise.all([
    api.getTodayVouchersByBranch(),
    api.getRecentActivity(),
    api.getArAgeingSummary(),
  ]);

  return { todayVouchers, recentActivity, arAgeing };
};

export const loadHrMgrDashboard = async () => api.getHrStats();
