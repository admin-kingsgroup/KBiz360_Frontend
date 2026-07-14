/* accountantWorkspace feature — public barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): every screen that used to live in
   accountantWorkspace.jsx moved to its actual current business module (per
   menus.js), which turned out to be THREE different top-level nav pills:
     - DashboardAccountant, ymOf, groupBalance, CashOutlookCard, NetAgeing
       (dead) -> accounts/dashboard-accountant/ (MENU_ACCOUNTS top-level leaf)
     - CollectionsFollowup -> accounts/receivables-clients/ (MENU_ACCOUNTS ▸
       Receivables & Clients)
     - SuspenseClearing, MonthEndChecklist -> accounts/period-close/
       (MENU_ACCOUNTS ▸ Period Close)
     - SupplierReco, ClientReco, InterBranchReco ->
       reconciliation/statement-matching/ (MENU_RECONCILIATION ▸ Statement
       Matching — a separate top-level module, already restructured earlier
       in this reorg)
     - TallyReco -> tally-reconciliation/vouchers/ (MENU_TALLY_RECON ▸
       Vouchers — another separate top-level module, already restructured)
   The ~1000-line shared UI kit (Shell, Table, Tile, th/td, aBtn, etc.) all of
   these depended on was extracted to ./shared.jsx rather than duplicated per
   destination.
   Re-exported below so App.jsx's single lazy-chunk barrel import needed zero
   changes, and so every existing test that imports directly from this
   barrel (or from individual moved files) keeps working. */
export { ymOf, groupBalance, CashOutlookCard, DashboardAccountant, NetAgeing } from '../accounts/dashboard-accountant/dashboardAccountant';
export { CollectionsFollowup } from '../accounts/receivables-clients/collectionsFollowup';
export { SuspenseClearing } from '../accounts/period-close/suspenseClearing';
export { MonthEndChecklist } from '../accounts/period-close/monthEndChecklist';
export { SupplierReco } from '../reconciliation/statement-matching/supplierReco';
export { ClientReco } from '../reconciliation/statement-matching/clientReco';
export { InterBranchReco } from '../reconciliation/statement-matching/interBranchReco';
export { TallyReco } from '../tally-reconciliation/vouchers/tallyReco';
