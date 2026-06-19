/* ════════════════════════════════════════════════════════════════════
   Settings feature — public barrel
   ════════════════════════════════════════════════════════════════════
   STRANGLER-FIG MIGRATION (mirrors finance / reports / masters): the
   original ~1720-line monolith now lives in `./legacy.jsx`. Screens move to
   the shared responsive scaffold (PageLayout / primitives / DataTable) one at
   a time under `./pages/`. This barrel re-exports the not-yet-migrated screens
   AND the migrated ones under their ORIGINAL names, so App.jsx and
   transactions.jsx keep importing from `modules/settings` unchanged.

   When a screen is migrated:
     1. add its page under `pages/` (primitives + responsive layout)
     2. add an explicit re-export below (it shadows the legacy `export *`)
     3. delete the dead component from `legacy.jsx`
   ──────────────────────────────────────────────────────────────────── */

// Not-yet-migrated screens. Explicit re-exports below take precedence.
export * from './legacy';

// ── Migrated → primitives + DataTable, feature-folder pages ─────────────────
export { SettingsAudit } from './pages/audit';
export { ApiKeySettings } from './pages/api-keys';
export { SettingsCompany } from './pages/company';
export { ApprovalWorkflow } from './pages/approval-workflow';
export { GspIrpSettings } from './pages/gsp-irp';
