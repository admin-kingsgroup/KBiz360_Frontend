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

   BUSINESS SUB-MODULE REORG (2026-07-13): screens are ALSO being regrouped by
   business sub-module — matching the nav menu's MENU_MASTERS groups — into
   voucher-master/, client-master/, supplier-master/, tax-master/,
   inventory-catalog-master/ and utilities/ folders (masters/shared/ holds the
   two cross-cutting internal helpers, MasterCrud and ExportBtn). Same rule:
   an explicit re-export below wins over the legacy `export *` catch-all.
   ──────────────────────────────────────────────────────────────────── */

// Not-yet-migrated screens + shared exports (ExportBtn, …). Explicit re-exports below win.
export * from './legacy';

// ── Migrated → primitives + DataTable, feature-folder pages ─────────────────
export { CurrencyMaster } from './pages/currency';
export { VendorAdvances } from './pages/vendor-advances';
export { BankAccountMaster } from './pages/bank-accounts';
export { Supplier360 } from './pages/supplier-360';
export { Customer360 } from './pages/customer-360';

// ── Business sub-module regroup — voucher-master/ ───────────────────────────
export { VoucherTypesMaster } from './voucher-master/voucherTypes';
export { NumberingSeriesMaster } from './voucher-master/numberingSeries';

// ── Business sub-module regroup — client-master/ ────────────────────────────
export { CustomersMaster } from './client-master/customers';
export { CustomerMasterTabbed } from './client-master/customerTabbed';

// ── Business sub-module regroup — supplier-master/ ──────────────────────────
export { SuppliersMaster } from './supplier-master/suppliers';
export { SupplierMasterTabbed } from './supplier-master/supplierTabbed';
export { MastersSubAgents } from './supplier-master/subAgents';
export { VendorTermsMaster } from './supplier-master/vendorTerms';
export { CreditFacilitiesMaster } from './supplier-master/creditFacilities';

// ── Business sub-module regroup — tax-master/ ───────────────────────────────
export { MastersTaxRates } from './tax-master/taxRates';

// ── Business sub-module regroup — inventory-catalog-master/ ─────────────────
export { MastersAirlines } from './inventory-catalog-master/airlines';
export { MastersHotels } from './inventory-catalog-master/hotels';
export { ProjectMaster } from './inventory-catalog-master/project';
export { TourCodeMaster } from './inventory-catalog-master/tourCodes';

// ── Business sub-module regroup — utilities/ ────────────────────────────────
export { PassportManager } from './utilities/passports';
export { ApprovalLimitsMaster } from './utilities/approvalLimits';
export { MergeRecordsUtility } from './utilities/mergeRecords';
export { BulkImportMaster } from './utilities/bulkImport';
