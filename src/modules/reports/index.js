/* ════════════════════════════════════════════════════════════════════
   Reports feature — public barrel
   ════════════════════════════════════════════════════════════════════
   BUSINESS SUB-MODULE REORG (2026-07-13): screens are grouped by business
   sub-module — matching the nav menu's MENU_REPORTS groups — into
   financial-statements/, profitability-gp/, operational/, working-capital/,
   compliance-tax/ and report-tools/ folders. moduleRegister.jsx,
   salesGpAnalytics.jsx, statistics.jsx and pages/client-statement.jsx,
   pages/tax-summary.jsx, pages/consolidated-bs.jsx, pages/schedule-iii-bs.jsx
   are NOT MENU_REPORTS items (they belong to Finance/Accounts/Taxation and
   are misfiled here) — left untouched, migrated in those modules' own phase.
   components/scaffold.jsx (RptShell, NotWired) is the shared scaffold used
   across both moved and not-moved pages — stays at its stable path.
   ──────────────────────────────────────────────────────────────────── */

// Not MENU_REPORTS items — belong to other business modules, left in place.
export { ModuleRegister } from './moduleRegister';
export { SalesGpAnalytics } from './salesGpAnalytics';
export { Statistics, voucherRegister } from './statistics';
export { ClientStatement } from './pages/client-statement';
export { RPT_TaxSummary } from './pages/tax-summary';
export { ConsolidatedBS } from './pages/consolidated-bs';
export { ScheduleIIIBS } from './pages/schedule-iii-bs';

// ── Shared report scaffold (rebuilt on responsive primitives) ───────────────
export { RptShell, NotWired } from './components/scaffold';

// ── Business sub-module regroup — financial-statements/ ─────────────────────
export { ReportViewerTabbed } from './financial-statements/reportViewer';
export { ReportCF } from './financial-statements/cashFlowStatement';
export { RPT_InterbranchElim } from './financial-statements/interbranchElimination';

// ── Business sub-module regroup — profitability-gp/ ──────────────────────────
export { ReportPackagePnL } from './profitability-gp/packagePnL';
export { ReportBranch } from './profitability-gp/branchComparison';
export { MisReport } from './profitability-gp/misReport';
export { ReportGP } from './profitability-gp/gpReport';
export { GroupDashboard } from './profitability-gp/groupDashboard';

// ── Business sub-module regroup — operational/ ───────────────────────────────
export { ConsultantReport } from './operational/consultantReport';
export { DestinationIntelligence } from './operational/destinationIntelligence';
export { ForexReport } from './operational/forex';
export { ReportCommission } from './operational/commissionIncome';

// ── Business sub-module regroup — working-capital/ ───────────────────────────
export { RatioAnalysis } from './working-capital/ratioAnalysis';
// CashFlowForecast/WorkingCapitalDashboard/CashFlowDirect moved in from
// finance/legacy.jsx (2026-07-14) — misfiled there; they're MENU_REPORTS ▸
// Working Capital screens (CashFlowDirect isn't menu-linked but is
// thematically grouped with the other two).
export { CashFlowForecast } from './working-capital/cashFlowForecast';
export { WorkingCapitalDashboard } from './working-capital/workingCapitalDashboard';
export { CashFlowDirect } from './working-capital/cashFlowDirect';

// ── Business sub-module regroup — compliance-tax/ ────────────────────────────
export { VarianceAnalysis } from './compliance-tax/varianceAnalysis';
export { ClientConcentration } from './compliance-tax/clientConcentration';
export { ReportExpenseBgt } from './compliance-tax/expenseBudgetVsActual';

// ── Business sub-module regroup — report-tools/ (live: /api/report-views + /api/report-schedules) ─
export { ReportsMetaDemo } from './report-tools/metaDemo';
export { CustomReportBuilder } from './report-tools/reportBuilder';
export { SavedReportViews } from './report-tools/savedViews';
export { ScheduledReports } from './report-tools/scheduledReports';
