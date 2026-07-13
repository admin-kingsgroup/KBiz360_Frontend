/* ════════════════════════════════════════════════════════════════════
   MODULES/SETTINGS/LEGACY.JSX — compatibility re-export shim
   ════════════════════════════════════════════════════════════════════
   BUSINESS SUB-MODULE REORG (2026-07-13): every screen that used to live
   in this file moved to its business sub-module folder — matching the
   nav menu's MENU_SETTINGS groups — under organization/, admin-power/,
   etc. This file is kept only because modules/tk-group/pages.jsx
   dynamically imports SettingsUsers directly from
   './modules/settings/legacy' (a distinct code chunk, not routed
   through the settings/index.js barrel) — deleting it outright would
   break that import with zero other changes made.
   ──────────────────────────────────────────────────────────────────── */

export { SettingsUsers } from './organization/users';
