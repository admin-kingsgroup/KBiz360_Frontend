/* directorDashboards feature — public barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): this file's only real reorg issue
   was living in a SEPARATE top-level folder from dashboard/ even though both
   serve MENU_DASHBOARDS — DirectorDash and its 18 panel exports moved to
   dashboard/director/directorDash.jsx (same module, no cross-boundary split
   needed). TargetsMaster was the one MENU_FINANCE-bound export in the
   original file and moved to finance/targetsMaster.jsx instead.
   Re-exported below so App.jsx's barrel import, and every existing test that
   imports directly from this barrel, needed zero changes. */
export {
  ExecutiveOverview, ProfitabilityDash, CashLiquidityDash, ReceivablesPayablesDash,
  BranchPerformanceDash, BalanceSheetDash, ModuleGpDash, SalesBookingsDash,
  SupplierPurchaseDash, TaxComplianceDash, ExpensesDash, ApprovalsAuditDash,
  VsTargetDash, BudgetVsExpenseDash, PerformanceDash, CashForecastDash,
  YoYGrowthDash, CustomerValueDash, DirectorDash,
} from '../dashboard/director/directorDash';
export { TargetsMaster } from '../finance/targetsMaster';
