/* accountingLive feature — public barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): DayBookLive, LedgerAcLive moved to
   accounts/books-scrutiny/; CashBookLive moved to accounts/cash-bank/;
   RegisterLive moved to accounts/sales-purchase/ (matching MENU_ACCOUNTS) —
   re-exported below so App.jsx's direct chunk import of this barrel needed
   zero changes. The ~500-line shared UI kit (Page, table chrome, date
   helpers, register pivot-column builders) these screens depend on — used
   by BOTH the moved screens and the screens that stayed here (VoucherEditor,
   TrialBalanceLive, ReportPnLLive, ReportBSLive, InvoiceGPLive,
   buildCaptureSheet) — was extracted to ./shared.jsx rather than duplicated.
   TrialBalanceLive/InvoiceGPLive are MENU_FINANCE-routed (not MENU_ACCOUNTS)
   and stay here pending the finance/taxation restructuring pass. */
export * from './legacy';
export { DayBookLive } from '../accounts/books-scrutiny/dayBookLive';
export { LedgerAcLive } from '../accounts/books-scrutiny/ledgerAcLive';
export { CashBookLive } from '../accounts/cash-bank/cashBookLive';
export { RegisterLive } from '../accounts/sales-purchase/registerLive';
