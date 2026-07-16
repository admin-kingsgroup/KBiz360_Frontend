/* Inter-branch feature barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): the elimination report, register,
   matrix and counterparty ledger moved to their business sub-module folders
   (matching the nav menu's MENU_REPORTS ▸ Financial Statements and
   MENU_ACCOUNTS ▸ Inter Branch groups) — re-exported below under their
   original names so App.jsx's direct chunk import of this barrel needed
   zero changes. isInterBranch/brName (shared utilities) stay in this folder.
   (interBranchVoucher.jsx — an unreferenced parallel INB form that hand-mirrored the
   backend's branch/tax constants — was DELETED: the live entry point is
   accounts/daily-entry/soPoGpVoucherEntry.jsx, and keeping a second copy of those
   constants only invited drift.) */
export * from './interbranch';
export { InterBranchRegister } from '../accounts/inter-branch/registerPl';
export { InterBranchMatrix } from '../accounts/inter-branch/tradeMatrix';
export { InterBranchCounterpartyLedger } from '../accounts/inter-branch/counterpartyLedger';
export { InboundInterBranch } from '../accounts/inter-branch/inboundInterBranch';
export { RPT_InterbranchElim } from '../reports/financial-statements/interbranchElimination';
