/* ════════════════════════════════════════════════════════════════════
   Masters feature — public barrel
   ════════════════════════════════════════════════════════════════════
   STRANGLER-FIG MIGRATION (mirrors modules/finance + modules/reports): the
   original ~2880-line monolith now lives in `./legacy.jsx`. Screens move to
   the shared responsive scaffold (PageLayout / primitives / DataTable) one at
   a time under `./pages/`. This barrel re-exports the not-yet-migrated screens
   AND the migrated ones under their ORIGINAL names, so App.jsx and
   transactions.jsx keep importing from `modules/masters` with zero changes.

   When a screen is migrated:
     1. add its page under `pages/` (primitives + responsive layout)
     2. add an explicit re-export below (it shadows the legacy `export *`)
     3. delete the dead component from `legacy.jsx`
   ──────────────────────────────────────────────────────────────────── */

// Not-yet-migrated screens + shared exports (ExportBtn, …). Explicit re-exports below win.
export * from './legacy';

// ── Migrated → primitives + DataTable, feature-folder pages ─────────────────
export { NumberingSeriesMaster } from './pages/numbering-series';
export { MastersTaxRates } from './pages/tax-rates';
export { CurrencyMaster } from './pages/currency';
export { ProjectMaster } from './pages/project';
export { VendorAdvances } from './pages/vendor-advances';
export { BankAccountMaster } from './pages/bank-accounts';
export { TourCodeMaster } from './pages/tour-codes';
export { MastersSubAgents } from './pages/sub-agents';
export { Supplier360 } from './pages/supplier-360';
