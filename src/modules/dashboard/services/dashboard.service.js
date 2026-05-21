import * as api from '../api';
import {
  computeBranchKpis,
  computeGpByModule,
  computeConsultantLeaderboard,
} from '../utils/transformers';
import { growthPct } from '../utils/helpers';

/**
 * Dashboard service — the only place that orchestrates `api/*` accessors and
 * domain transformers. Hooks should call into the service, not the api layer
 * directly, so business logic stays out of React.
 */

export const loadBranchDashboard = async ({ branchCode, branch }) => {
  const [
    bills,
    billsPrev,
    billsYtd,
    expenses,
    actionItems,
    upcomingTravel,
    unmatched,
  ] = await Promise.all([
    api.getBillsForBranchMonth(branchCode),
    api.getBillsForPreviousMonth(branchCode),
    api.getBillsYearToDate(branchCode),
    api.getExpensesForBranchMonth(branchCode),
    api.getActionItems(),
    api.getUpcomingTravel({ limit: 5 }),
    api.getUnmatchedTickets(branch),
  ]);

  const currentKpis = computeBranchKpis(bills);
  const prevKpis = computeBranchKpis(billsPrev);
  const ytdKpis = computeBranchKpis(billsYtd);
  const totalExpenses = expenses.reduce((s, a) => s + a.a, 0);

  return {
    bills,
    billsYtd,
    expenses,
    actionItems,
    upcomingTravel,
    unmatchedCount: unmatched.totalCount,
    kpis: {
      ...currentKpis,
      netProfit: currentKpis.gp - totalExpenses,
      expenses: totalExpenses,
      revenueGrowth: growthPct(currentKpis.revenue, prevKpis.revenue),
      gpGrowth: growthPct(currentKpis.gp, prevKpis.gp),
      outstanding: Math.round(currentKpis.revenue * 0.27),
      ytdRevenue: ytdKpis.revenue,
      ytdGp: ytdKpis.gp,
      ytdBookings: ytdKpis.bookings,
    },
    gpByModule: computeGpByModule(bills, currentKpis.gp),
    topConsultants: computeConsultantLeaderboard(bills),
  };
};

export const loadDirectorDashboard = async () => {
  const [revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers, bankAccounts] =
    await Promise.all([
      api.getRevenueTrend(),
      api.getFyTargets(),
      api.getBranchHeatmap(),
      api.getKeyAlerts(),
      api.getTopCustomers(),
      api.getTopSuppliers(),
      api.getBankAccounts(),
    ]);

  return { revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers, bankAccounts };
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
