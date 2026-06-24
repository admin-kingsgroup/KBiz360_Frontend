import { apiGet } from '../../../core/api';
import { todayISO } from '../../../core/dates';
import { tallyVouchersByBranch, vouchersToActivity } from '../utils/transformers';

// Voucher-activity accessors — LIVE from /api/vouchers. No seed arrays. The pure
// shaping lives in utils/transformers (tallyVouchersByBranch, vouchersToActivity).

const ymd = (d) => d.toISOString().slice(0, 10);
const daysAgoISO = (n) => { const d = new Date(todayISO() + 'T00:00:00'); d.setDate(d.getDate() - n); return ymd(d); };

// Today's receipt/payment/journal volume, grouped by branch.
// Honours the branch selector: a branchCode → only that branch; null/undefined
// (Group / TK HO Group) → all branches.
export const getTodayVouchersByBranch = async (branchCode) => {
  try {
    const t = todayISO();
    const vouchers = (await apiGet('/api/vouchers', { from: t, to: t, branch: branchCode })) || [];
    return tallyVouchersByBranch(vouchers);
  } catch { return {}; }
};

// Most recent voucher activity (last 7 days, latest first). Scoped to the branch
// selector (branchCode → that branch; null → all branches).
export const getRecentActivity = async (branchCode) => {
  try {
    const vouchers = (await apiGet('/api/vouchers', { from: daysAgoISO(7), to: todayISO(), branch: branchCode })) || [];
    return vouchersToActivity(vouchers);
  } catch { return []; }
};
