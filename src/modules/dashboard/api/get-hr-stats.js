import { apiGet } from '../../../core/api';

// HR dashboard stats — LIVE from the employee master (/api/employees/stats).
// Headcount, joiners, birthdays/anniversaries derive from real employees; attendance %,
// punctuality %, pending leave, payroll status and open positions come from the live
// attendance / leave / payroll / shift / recruitment collections (honest null/0 when a
// collection is empty, rendered as "—"). Falls back to this empty payload on error so a
// failed call never blanks the page — its shape mirrors the real payload exactly.
const EMPTY = { totalHeadcount: 0, changeThisMonth: 0, attendancePct: null, punctualityPct: null, pendingLeave: 0, payrollStatus: 'Not run', openPositions: 0, birthdays: [], anniversaries: [] };

// `branchCode` (null/undefined = the caller's full scope) honours the dashboard branch
// selector; the backend confines it to the caller's allowed branches.
export const getHrStats = async (branchCode) => {
  try { return (await apiGet('/api/employees/stats', { branch: branchCode })) || EMPTY; }
  catch { return EMPTY; }
};
