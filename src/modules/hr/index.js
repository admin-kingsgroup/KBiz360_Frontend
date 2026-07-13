/* ════════════════════════════════════════════════════════════════════
   hr feature — public barrel (strangler-fig split; see reports/masters/settings).
   ════════════════════════════════════════════════════════════════════
   BUSINESS SUB-MODULE REORG (2026-07-13): screens are being regrouped by
   business sub-module — matching the nav menu's MENU_HR groups — into
   employee-master/, operations/, payroll/, expense-loans/ and self-service/
   folders. The not-yet-migrated remainder (ExpenseBudget — actually a
   Finance-menu item, left untouched here) stays in `./legacy.jsx`. Same
   rule as the masters reorg: an explicit re-export below wins over the
   legacy `export *` catch-all, so App.jsx keeps importing from
   `modules/hr` with zero changes.
   ──────────────────────────────────────────────────────────────────── */

// Not-yet-migrated screens + shared exports. Explicit re-exports below win.
export * from './legacy';

// ── Business sub-module regroup — employee-master/ ──────────────────────────
export { HrEmployees } from './employee-master/employees';
export { EmployeeMasterTabbed } from './employee-master/employeeTabbed';

// ── Business sub-module regroup — operations/ ────────────────────────────────
export { HrShifts } from './operations/shifts';
export { HrAttendance } from './operations/attendance';
export { HrLeave } from './operations/leave';

// ── Business sub-module regroup — payroll/ ───────────────────────────────────
export { HrPayroll } from './payroll/salaryRun';
export { HrPayslips } from './payroll/payslips';
export { SalaryRevision } from './payroll/salaryRevision';
export { PfEsiChallan } from './payroll/pfEsiChallan';
export { GratuityEstimateView } from './payroll/gratuity';

// ── Business sub-module regroup — expense-loans/ ─────────────────────────────
export { EmployeeAdvances } from './expense-loans/employeeAdvances';

// ── Business sub-module regroup — self-service/ ──────────────────────────────
export { HRPortal } from './self-service/portal';
export { LeaveApply } from './self-service/leaveApply';
export { ReimbursementClaim } from './self-service/reimbursementClaim';
export { MyPayslip } from './self-service/myPayslip';
export { MyForm16 } from './self-service/form16';
export { PerformanceReview } from './self-service/performanceReview';
export { Feedback360 } from './self-service/feedback360';
export { SkillMatrix } from './self-service/skillMatrix';
