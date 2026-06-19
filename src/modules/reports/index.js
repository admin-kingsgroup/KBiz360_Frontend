/* ════════════════════════════════════════════════════════════════════
   Reports feature — public barrel
   ════════════════════════════════════════════════════════════════════
   STRANGLER-FIG MIGRATION (mirrors modules/finance): the original
   ~3300-line monolith now lives in `./legacy.jsx`. Screens are moved into
   the shared responsive scaffold (PageLayout / primitives / DataTable) one
   at a time under `./pages/`. This barrel re-exports the not-yet-migrated
   screens AND the migrated ones under their ORIGINAL names, so App.jsx (and
   finance/legacy.jsx, financialStatements.jsx) keep importing from
   `modules/reports` with zero changes.

   When a screen is migrated:
     1. add its page under `pages/` (primitives + responsive layout)
     2. add an explicit re-export below (it shadows the legacy `export *`)
     3. delete the dead component from `legacy.jsx`
   ──────────────────────────────────────────────────────────────────── */

// Not-yet-migrated screens + shared exports. Explicit re-exports below win.
export * from './legacy';

// ── Shared report scaffold (rebuilt on responsive primitives) ───────────────
export { RptShell, NotWired } from './components/scaffold';

// ── Migrated → primitives + DataTable, feature-folder pages ─────────────────
export { ReportBranch } from './pages/branch-comparison';
export { ConsultantReport } from './pages/consultant-productivity';
export { ClientConcentration } from './pages/client-concentration';
export { DestinationIntelligence } from './pages/destination-intelligence';
export { ForexReport } from './pages/forex';
export { ReportCommission } from './pages/commission-income';
export { RatioAnalysis } from './pages/ratio-analysis';
export { ReportCF } from './pages/cash-flow-statement';
export { ClientStatement } from './pages/client-statement';
export { RPT_TaxSummary } from './pages/tax-summary';
export { ConsolidatedBS } from './pages/consolidated-bs';
export { ScheduleIIIBS } from './pages/schedule-iii-bs';
export { ReportExpenseBgt } from './pages/expense-budget';
export { MisReport } from './pages/mis-report';
export { ReportGP } from './pages/gp-report';
