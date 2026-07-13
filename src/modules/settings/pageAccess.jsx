/* ════════════════════════════════════════════════════════════════════
   MODULES/SETTINGS/PAGEACCESS.JSX — compatibility re-export shim
   ════════════════════════════════════════════════════════════════════
   PageAccessControl moved to ./organization/pageAccess.jsx (business
   sub-module reorg, matching the nav menu's MENU_SETTINGS ▸ Organization
   group). This file is kept only because App.jsx dynamically imports it
   directly from './modules/settings/pageAccess' (a distinct code chunk,
   not routed through the settings/index.js barrel), and
   modules/tk-group/pages.jsx + a test also import this exact path —
   deleting it outright would break those with zero other changes made.
   ──────────────────────────────────────────────────────────────────── */

export { PageAccessControl } from './organization/pageAccess';
