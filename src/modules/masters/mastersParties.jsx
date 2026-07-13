/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-PARTIES.JSX — compatibility re-export shim
   ════════════════════════════════════════════════════════════════════
   The 12-tab Customer & Supplier Master screens have moved to their
   business sub-module folders (strangler-fig masters reorg, matching the
   nav menu's MENU_MASTERS groups):
     • CustomerMasterTabbed → ./client-master/customerTabbed
     • SupplierMasterTabbed → ./supplier-master/supplierTabbed
   This file is kept only because App.jsx dynamically imports these two
   names directly from './modules/masters/mastersParties' (a distinct code
   chunk, not routed through the masters/index.js barrel) — deleting it
   outright would break that import with zero other changes to App.jsx.
   ──────────────────────────────────────────────────────────────────── */

export { CustomerMasterTabbed } from './client-master/customerTabbed';
export { SupplierMasterTabbed } from './supplier-master/supplierTabbed';
