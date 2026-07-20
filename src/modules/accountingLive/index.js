/* accountingLive feature — public barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): DayBookLive, LedgerAcLive moved to
   accounts/books-scrutiny/; CashBookLive moved to accounts/cash-bank/;
   RegisterLive moved to accounts/sales-purchase/ (matching MENU_ACCOUNTS) —
   re-exported below so App.jsx's direct chunk import of this barrel needed
   zero changes. The ~500-line shared UI kit (Page, table chrome, date
   helpers, register pivot-column builders) these screens depend on — used
   by BOTH the moved screens and the screens that stayed here (VoucherEditor,
   ReportPnLLive, ReportBSLive, buildCaptureSheet — the latter two dead,
   superseded by accounts/branch-mis/reportsLive.jsx) — was extracted to
   ./shared.jsx rather than duplicated.

   BUSINESS SUB-MODULE REORG (2026-07-14): InvoiceGPLive (+ its exclusive
   ViewToggle) moved to finance/registers-outstanding/ — MENU_FINANCE-routed,
   not MENU_ACCOUNTS. Re-exported below for the same reason as the other moved
   screens. (The old TrialBalanceLive was superseded by finance/pages/trial-
   balance.jsx in the Trial Balance dedup and has been removed.) */
export * from './legacy';
export { DayBookLive } from '../accounts/books-scrutiny/dayBookLive';
export { LedgerAcLive } from '../accounts/books-scrutiny/ledgerAcLive';
export { CashBookLive } from '../accounts/cash-bank/cashBookLive';
export { RegisterLive } from '../accounts/sales-purchase/registerLive';
export { InvoiceGPLive } from '../finance/registers-outstanding/invoiceGPLive';
