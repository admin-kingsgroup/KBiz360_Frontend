/* ════════════════════════════════════════════════════════════════════
   Finance feature — public barrel
   ════════════════════════════════════════════════════════════════════
   STRANGLER-FIG MIGRATION: the original 1900-line monolith now lives in
   `./legacy.jsx`. Each screen is being moved into the canonical feature
   layout (api → service → hook → page) one at a time. This barrel re-exports
   the not-yet-migrated screens AND the migrated ones under their ORIGINAL
   names, so `App.jsx` / `transactions.jsx` / `taxation.jsx` keep importing
   from `modules/finance` with zero changes.

   When a screen is migrated:
     1. add its page under `pages/` (live API via hooks/services)
     2. add an explicit re-export below (it shadows the legacy `export *`)
     3. delete the dead component from `legacy.jsx`
   ──────────────────────────────────────────────────────────────────── */

// Not-yet-migrated screens (BankReco, DayBook, LedgerAc, …) + shared exports
// such as TDS_SECTIONS. Explicit named re-exports below take precedence.
export * from './legacy';

// ── Migrated → live, feature-folder, DataTable-based ────────────────────────
export { TrialBalancePage as TrialBalance } from './pages/trial-balance';

// Declarative route table consumed by the incremental react-router host.
export { financeRoutes } from './routes';
