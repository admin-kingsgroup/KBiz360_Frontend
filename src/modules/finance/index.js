/* ════════════════════════════════════════════════════════════════════
   Finance feature — public barrel
   ════════════════════════════════════════════════════════════════════
   BUSINESS SUB-MODULE REORG (2026-07-14): the old 1900-line legacy.jsx
   monolith is gone — every export has moved to its correct business
   module. Genuinely Finance-bound screens moved into business-sub-module
   folders (matching MENU_FINANCE's nav groups): period-end-targets-accruals/
   (Loan/EMI Register, Investment Register) and tools-calculators/ (Interest
   Calculator, Loan Amortization). Six screens that were misfiled in the
   monolith moved OUT to their real modules: CashFlowForecast,
   WorkingCapitalDashboard, CashFlowDirect → reports/working-capital/
   (MENU_REPORTS ▸ Working Capital); BankReco, ReconciliationQueue →
   reconciliation/statement-matching/ (MENU_RECONCILIATION ▸ Statement
   Matching); TDSCalculator → taxation/ (Taxation regime menus);
   BankBalanceDashboard → accounts/cash-bank/ (MENU_ACCOUNTS ▸ Cash & Bank);
   InvestmentDeclaration → hr/self-service/ (MENU_HR ▸ Self-Service).
   All re-exported below under their ORIGINAL names so App.jsx's single
   `lazyModule(() => import('./modules/finance'))` destructure needed zero
   changes.
   ──────────────────────────────────────────────────────────────────── */

// ── Business sub-module regroup — period-end-targets-accruals/ ──────────────
export { LoanEmiRegister } from './period-end-targets-accruals/loanEmiRegister';
export { InvestmentRegister } from './period-end-targets-accruals/investmentRegister';

// ── Business sub-module regroup — tools-calculators/ ─────────────────────────
export { InterestCalculator } from './tools-calculators/interestCalculator';
export { LoanAmortization } from './tools-calculators/loanAmortization';

// ── Misfiled in the old monolith — actually other business modules ──────────
export { CashFlowForecast, WorkingCapitalDashboard, CashFlowDirect } from '../reports';
// BankReco/ReconciliationQueue import the sibling files directly rather than
// via '../reconciliation' — that barrel is eagerly evaluated in full by
// reconciliation/routes/index.jsx's dynamic import('../index') for every lazy
// route, so re-exporting a live-data screen from it would pull the whole
// api/data hook chain into every reconciliation route (see the NOTE in
// reconciliation/index.js).
export { BankReco } from '../reconciliation/statement-matching/bankReco';
export { ReconciliationQueue } from '../reconciliation/statement-matching/reconciliationQueue';
export { TDSCalculator } from '../taxation';
export { BankBalanceDashboard } from '../accounts/cash-bank/bankBalanceDashboard';
export { InvestmentDeclaration } from '../hr';

// ── Migrated → live, feature-folder, DataTable-based ────────────────────────
export { TrialBalancePage as TrialBalance } from './pages/trial-balance';
export { YearEndClosePage as YearEndClose } from './pages/year-end-close';

// Declarative route table consumed by the incremental react-router host.
export { financeRoutes } from './routes';
