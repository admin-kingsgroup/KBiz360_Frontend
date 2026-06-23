import { apiGet } from '../../../core/api';

// HR dashboard stats — LIVE from the employee master (/api/employees/stats).
// Headcount, this-month joiners and upcoming birthdays/anniversaries are derived
// from real employees; attendance/leave/payroll have no subsystem yet so the
// backend returns honest nulls/zeros (rendered as "—"), never a fabricated figure.
// Falls back to an empty payload on error so a failed call never blanks the page.
const EMPTY = { totalHeadcount: 0, changeThisMonth: 0, attendancePct: null, pendingLeave: 0, payrollStatus: 'Not run', openPositions: 0, birthdays: [], anniversaries: [] };

export const getHrStats = async () => {
  try { return (await apiGet('/api/employees/stats')) || EMPTY; }
  catch { return EMPTY; }
};
