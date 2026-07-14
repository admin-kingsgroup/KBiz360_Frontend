/* ho-control feature — public barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): GroupDashboard, BankingApiSettings,
   StatutoryFilingRegister and DelegationsManager moved to their business
   sub-module folders (reports/profitability-gp, settings/integrations,
   settings/compliance-workflow) — re-exported below so App.jsx's direct
   chunk import of this barrel needed zero changes. GroupBookings and
   PeriodLocking (dead code, unrouted) stay in ./legacy. */
export * from './legacy';
export { GroupDashboard } from '../reports/profitability-gp/groupDashboard';
export { BankingApiSettings } from '../settings/integrations/bankingApi';
export { StatutoryFilingRegister } from '../settings/compliance-workflow/statutoryFilingRegister';
export { DelegationsManager } from '../settings/compliance-workflow/delegationsManager';
