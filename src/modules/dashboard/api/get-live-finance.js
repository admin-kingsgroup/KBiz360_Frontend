import { apiGet } from '../../../core/api';
import { CUR_MONTH, CUR_FY, CUR_QUARTER, todayISO, monthLabel, prevMonthKey } from '../../../core/dates';

/**
 * Live finance accessors for the dashboards — sourced from the same double-entry
 * engine that powers Reports → P&L / Balance Sheet (module-wise GP, ageing).
 * Every reader falls back to a zero/empty result on error so one slow/failed
 * call never blanks the whole dashboard.
 *
 * All period defaults derive from core/dates.js (single source of truth for
 * "now") — never hard-coded test dates.
 */

/**
 * ISO date range + label for a dashboard period mode:
 *   'month'   → current calendar month (default)
 *   'quarter' → current financial-year quarter (e.g. Apr 1 → Jun 30)
 *   'ytd'     → financial-year-to-date (Apr 1 → today)
 *   'all'     → every entry since inception (no bounds)
 * Upper bounds use the `-31` day sentinel: for ISO YYYY-MM-DD dates no day in a
 * month sorts above `-31`, so `$lte 'YYYY-MM-31'` captures the whole month and
 * nothing past it.
 */
export function rangeToDates(mode = 'month') {
  switch (mode) {
    case 'quarter': return { from: CUR_QUARTER.startISO, to: CUR_QUARTER.endISO, label: `${CUR_QUARTER.label} · current quarter` };
    case 'ytd': return { from: CUR_FY.startISO, to: todayISO(), label: `FY ${CUR_FY.label} · year-to-date` };
    case 'all': return { from: '', to: '', label: 'All time · since inception' };
    case 'month':
    default:    return { from: `${CUR_MONTH}-01`, to: `${CUR_MONTH}-31`, label: `${monthLabel(CUR_MONTH)} · current month` };
  }
}

// Current vs previous calendar month + FY-to-date (for the branch dashboard's
// MoM growth and YTD tiles).
export function periods() {
  const prev = prevMonthKey(CUR_MONTH); // "YYYY-MM"
  return {
    month: { from: `${CUR_MONTH}-01`, to: `${CUR_MONTH}-31` },
    prevMonth: { from: `${prev}-01`, to: `${prev}-31` },
    ytd: { from: CUR_FY.startISO, to: todayISO() },
  };
}

const EMPTY_MPL = {
  modules: [],
  totals: { sales: 0, cogs: 0, incentive: 0, gp: 0, gpPct: 0 },
  indirect: { groups: [], expense: 0, income: 0 },
  bridge: { grossProfit: 0, indirectExpense: 0, indirectIncome: 0, netProfit: 0 },
};

// Module-wise Sales / COGS / Gross Profit → Net Profit bridge for a period.
export async function getModulePL({ branchCode, from, to } = {}) {
  try {
    return (await apiGet('/api/accounting/module-pl', { branch: branchCode, from, to })) || EMPTY_MPL;
  } catch {
    return EMPTY_MPL;
  }
}

// Total open receivables (Σ all ageing buckets) — the dashboard "Outstanding" KPI.
export async function getReceivablesOutstanding(branchCode) {
  try {
    const d = await apiGet('/api/accounting/ageing', { branch: branchCode });
    return Math.round(d?.receivables?.totals?.total || 0);
  } catch {
    return 0;
  }
}

// Unsettled receivable + payable in one ageing call — the dashboard "pending to
// settle" tiles. Receivable = open sale bills net of receipts/credit-notes;
// Payable = open purchase/expense bills net of payments/debit-notes. Same FIFO
// engine the bill-wise allocation panel settles against.
export async function getAgeingTotals(branchCode) {
  try {
    const d = await apiGet('/api/accounting/ageing', { branch: branchCode });
    return {
      receivable: Math.round(d?.receivables?.totals?.total || 0),
      payable:    Math.round(d?.payables?.totals?.total || 0),
    };
  } catch {
    return { receivable: 0, payable: 0 };
  }
}

// Cash & bank position (live) — Σ closing balances of the Bank Accounts +
// Cash-in-Hand groups from the Balance Sheet (already INR, as-on date).
const CASH_GROUPS = new Set(['Bank Accounts', 'Cash-in-Hand']);
export async function getCashPosition(branchCode) {
  try {
    const d = await apiGet('/api/accounting/balance-sheet', { branch: branchCode });
    return Math.round((d?.assets || []).filter((g) => CASH_GROUPS.has(g.group)).reduce((s, g) => s + (g.amount || 0), 0));
  } catch {
    return 0;
  }
}

// Sale vouchers for a period — used to build the consultant leaderboard
// (the engine aggregates GP by cost-centre, not by consultant).
export async function getSaleVouchers({ branchCode, from, to } = {}) {
  try {
    return (await apiGet('/api/vouchers', { branch: branchCode, category: 'sale', from, to })) || [];
  } catch {
    return [];
  }
}
