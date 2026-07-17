/* ════════════════════════════════════════════════════════════════════
   CORE/MENUS.JS
   Auto-generated from KBiz360_v2.jsx · 361 lines · 11 declarations
   ════════════════════════════════════════════════════════════════════ */

import { ArrowLeftRight, BarChart2, Calculator, Calendar, CheckSquare, Database, Download, LayoutDashboard, LifeBuoy, Lock, Rocket, Scale, Settings, ShieldCheck, Upload, User, Users, Wallet, Wrench } from 'lucide-react';
import { TAX_AFRICA, TAX_ALL, TAX_INDIA } from './data';
import { PERM_MODULES } from './permissions';
import { getRole } from './referenceCache';
import { isPageAccessAdmin, isOwnerDashboardUser } from './pageCatalog';
/* (Removed dead imports of Recruitment from './helpers' and Dashboard from
   '../modules/dashboard' — only their string labels/hrefs are used in the menu
   tree, never the component values. Dropping them also keeps the menu out of
   the helpers + dashboard feature chunks.) */

// Organised on Tally's master taxonomy: Accounts Info · Statutory Info ·
// Parties (which in Tally are just ledgers) · Inventory & Catalog · Utilities.
export const MENU_MASTERS = {label:"Masters", icon:Database, children:[
  // Accounts Master (Chart of Accounts, Cost Centres, Budgets, Scenarios) lives
  // under the ACCOUNTS header now — see MENU_ACCOUNTS ▸ "Accounts Master".
  {label:"Voucher Master", children:[
    {label:"Voucher Types", href:"/masters/voucher-types"},
    {label:"Numbering Series (auto)", href:"/masters/numbering"},
  ]},
  {label:"Client Master", children:[
    {label:"Clients (Sundry Debtors)", href:"/masters/customers"},
    {label:"Client — 12-Tab View", href:"/masters/customer-tabs"},
  ]},
  {label:"Supplier Master", children:[
    {label:"Suppliers (Sundry Creditors)", href:"/masters/suppliers"},
    {label:"Supplier — 12-Tab View", href:"/masters/supplier-tabs"},
    {label:"Sub-Agents", href:"/masters/sub-agents"},
    {label:"Vendor Credit Terms", href:"/masters/vendor-terms"},
    {label:"Credit Facilities & Limits", href:"/masters/credit-facilities"},
  ]},
  {label:"Tax Master", children:[
    {label:"Tax / HSN-SAC Codes", href:"/masters/tax"},
    // Currencies & Forex Rates moved to ACCOUNTS ▸ Accounts Master ▸ Currency.
  ]},
  {label:"Inventory & Catalog Master", children:[
    {divider:true, label:"Travel Inventory"},
    {label:"Airlines & GDSs", href:"/masters/airlines"},
    {label:"Hotels & DMCs", href:"/masters/hotels"},
    {label:"Seat Inventory", href:"/masters/seats"},
    {divider:true, label:"Codes & Rates"},
    {label:"Tour Codes", href:"/masters/tour-codes"},
    {label:"Project / Tour Code Master", href:"/masters/projects"},
    {label:"Service Charge - 2 Rates", href:"/masters/markup"},
  ]},
  // Employee Master + 10-Tab View now live under the dedicated HR pill
  // (HR ▸ Employee Master) — removed here to avoid the duplicate entry point.
  {label:"Utilities", children:[
    {label:"Passport Register", href:"/masters/passports"},
    {label:"Document Type Master", href:"/masters/doc-types"},
    {label:"Approval Limits Master", href:"/masters/approval-limits"},
    {label:"Merge Duplicate Records", href:"/masters/merge"},
  ]},
]};

/* ── SALES ───────────────────────────────────────────────────── */

/* ── PURCHASE ────────────────────────────────────────────────── */


export const MENU_ASSETS={label:"Assets",icon:Wrench,children:[
  {label:"Fixed Asset Register",      href:"/assets/register"},
  {label:"Depreciation Schedule",     href:"/assets/depreciation"},
  {label:"Asset Disposal & Transfer", href:"/assets/disposal"},
  {label:"Block of Assets (IT Act)",  href:"/assets/blocks"},
]};


/* ── FINANCE ─────────────────────────────────────────────────── */

// NOTE: every item that also appears under the ACCOUNTS pill (MENU_ACCOUNTS)
// has been removed here to avoid duplication — the Accounts workspace owns all
// daily vouchers, the per-type registers, the day/cash books, BSP memos, etc.
// Finance now keeps ONLY the items that are NOT in Accounts (combined module
// register, classic Trial Balance, GDS import, cancellations/refunds, period-end
// accruals & targets, and the calculator/entry-helper tools).
export const MENU_FINANCE = {label:"Finance", icon:Wallet, children:[
  {label:"Registers & Outstanding", children:[
    {label:"Module Sales & Purchase Register", href:"/finance/module-register"},
    {label:"Module Sales Register",     href:"/finance/module-sales-register"},
    {label:"Module Purchase Register",  href:"/finance/module-purchase-register"},
    {label:"Invoice-wise GP (Link No)", href:"/reports/invoice-gp"},
    {label:"Sales & GP Analytics",      href:"/reports/sales-gp-analytics"},
  ]},
  {label:"Books", children:[
    {label:"Trial Balance", href:"/trial-balance"},
    {label:"Reconciliation Status", href:"/finance/recon-status"},
  ]},
  {label:"BSP & Airline Memos", children:[
    {label:"GDS / PNR Import", href:"/purchase/gds-import"},
    {label:"Sales Cancellations", href:"/sales/cancellation"},
    {label:"Purchase Refunds", href:"/purchase/refunds"},
  ]},
  {label:"Period-End, Targets & Accruals", children:[
    {divider:true, label:"Period-End"},
    {label:"Intercompany", href:"/accounting/intercompany"},
    {divider:true, label:"Targets & Budgets"},
    {label:"Sales Targets", href:"/finance/targets"},
    {label:"Expense Budget", href:"/expense/budget"},
    {divider:true, label:"Registers"},
    {label:"Loan / EMI Register", href:"/accounting/loans"},
    {label:"Investment Register", href:"/finance/investments"},
  ]},
  {label:"Tools & Calculators", children:[
    {label:"Interest Calculator", href:"/finance/interest-calc"},
    {label:"Loan Amortization Schedule", href:"/finance/loan-amort"},
    {divider:true, label:"Entry helpers"},
    {label:"Print Preview Before Saving", href:"/finance/print-preview"},
    {label:"Auto-linked Vouchers", href:"/finance/auto-linked"},
    {label:"Voucher Entry (8-Tab View)", href:"/transactions/voucher-tabs"},
  ]},
]};

/* ── TAXATION — INDIA GST ────────────────────────────────────── */

export const MENU_REPORTS = {label:"Reports", icon:BarChart2, children:[
  // P&L, Balance Sheet, Cash Position & Audit Trail are account reports — they
  // live under the Accounts pill now (Accounts ▸ Branch MIS / Books & Scrutiny).
  {label:"Financial Statements", children:[
    {label:"Cash Flow Statement", href:"/reports/cf"},
    {label:"Report Viewer (9-Tab View)", href:"/reports/viewer"},
    {label:"Inter-branch Elimination", href:"/reports/interbranch"},
    {label:"Notes to Financial Statements", href:"/reports/fs-notes"},
  ]},
  {label:"Profitability & GP", children:[
    // Sales & GP Analytics + Invoice-wise GP live in Finance ▸ Registers &
    // Outstanding (kept there to avoid the duplicate entry point).
    {divider:true, label:"Gross Profit"},
    {label:"GP Reports (Multi-view)", href:"/reports/gp"},
    {label:"Package P&L", href:"/reports/package-pl"},
    {divider:true, label:"Yield"},
    {label:"Yield by Destination", href:"/reports/yield-destination"},
    {label:"Yield by Consultant", href:"/reports/yield-consultant"},
    {label:"Yield by Supplier (Cost Variance)", href:"/reports/yield-supplier"},
    {divider:true, label:"Customer & Product"},
    {label:"Customer LTV", href:"/reports/customer-ltv"},
    {label:"ABC Analysis (Pareto)", href:"/reports/abc-analysis"},
    {divider:true, label:"Comparative & Group"},
    {label:"Year-over-Year Comparison", href:"/reports/yoy"},
    {label:"Branch Comparison", href:"/reports/branch"},
    {label:"MIS One-Pager", href:"/reports/mis"},
    {label:"Group Dashboard", href:"/group-dashboard"},
  ]},
  // Sales/Purchase Register + Client Statement are account reports — see
  // Accounts ▸ Sales & Purchase / Receivables & Clients.
  {label:"Operational", children:[
    {label:"Consultant Report", href:"/reports/consultant"},
    {label:"Destination Intel", href:"/reports/destination"},
    {label:"Commission Income", href:"/reports/commission"},
  ]},
  // Receivables & Payables are account reports — see Accounts ▸ Receivables &
  // Collections / Payables & Suppliers.
  {label:"Working Capital", children:[
    {label:"Cash Flow Forecast 90d", href:"/reports/cashflow-forecast"},
    {label:"Working Capital Dashboard", href:"/reports/working-capital"},
    {label:"Ratio Analysis", href:"/reports/ratios"},
  ]},
  {label:"Compliance & Tax", children:[
    {label:"Variance Analysis", href:"/reports/variance"},
    // GST/VAT Summary, Statutory Dues Calendar & Tax Filing Status Board are tax
    // reports — they live under the regime-aware Taxation pill (see core/data.js).
    {label:"Budget vs Actual", href:"/reports/budget"},
    {label:"Expense Budget vs Actual", href:"/reports/exp-bgt"},
    // Tally XML Export lives under Admin ▸ Import / Export Data ▸ Export.
    {label:"Client Concentration Risk", href:"/reports/concentration"},
  ]},
  {label:"Report Tools", children:[
    {label:"Custom Report Builder", href:"/reports/builder"},
    {label:"Saved Report Views", href:"/reports/saved-views"},
    {label:"Scheduled Email Reports", href:"/reports/scheduled"},
    {label:"Meta Features Demo", href:"/reports/meta-demo"},
  ]}
]};

/* ── HR ──────────────────────────────────────────────────────── */

// Dedicated HR Management pill — every HR master, operation, payroll item,
// HR report and self-service screen in one header (pulled out of Admin and the
// Masters/Reports pills so nothing HR is duplicated elsewhere).
export const MENU_HR = {label:"HR", icon:Users, children:[
  {label:"Employee Master", children:[
    {label:"Employee Master", href:"/hr/employees"},
    {label:"Employee (10-Tab View)", href:"/hr/employee-tabs"},
  ]},
  {label:"Operations", children:[
    {label:"Shift Master", href:"/hr/shifts"},
    {label:"Attendance", href:"/hr/attendance"},
    {label:"Leave Management", href:"/hr/leave"},
    {label:"Recruitment", href:"/hr/recruitment"},
  ]},
  {label:"Payroll", children:[
    {label:"Salary Run", href:"/hr/payroll"},
    {label:"Payslips", href:"/hr/payslips"},
    {label:"Salary Revision", href:"/hr/salary-revision"},
    {label:"PF/ESI Challan", href:"/hr/pf-esi"},
    {label:"Gratuity Register", href:"/hr/gratuity"},
  ]},
  {label:"Expense & Loans", children:[
    {label:"Employee Loans & Advances", href:"/hr/loans-advances"},
  ]},
  {label:"HR Reports", children:[
    {label:"Leave Utilization Report", href:"/hr/leave-utilization"},
    {label:"Attrition Report", href:"/hr/attrition"},
    {label:"Birthday & Anniversary Calendar", href:"/hr/calendar"},
  ]},
  {label:"Self-Service", children:[
    {divider:true, label:"Portal"},
    {label:"Employee Portal", href:"/hr/portal"},
    {divider:true, label:"Requests"},
    {label:"Leave Application", href:"/hr/leave-apply"},
    {label:"Reimbursement Claim", href:"/hr/reimbursement"},
    {divider:true, label:"Pay & Tax"},
    {label:"My Payslip", href:"/hr/my-payslip"},
    {label:"Investment Declaration", href:"/hr/investment-declaration"},
    {label:"Form 16 (Download)", href:"/hr/form-16"},
    {divider:true, label:"Performance"},
    {label:"Performance Review", href:"/hr/performance"},
    {label:"360° Feedback", href:"/hr/feedback-360"},
    {label:"Skill Matrix", href:"/hr/skills"},
  ]}
]};

/* ── SETTINGS ────────────────────────────────────────────────── */

export const MENU_SETTINGS = {label:"Settings", icon:Settings, children:[
  {label:"Organization", children:[
    {label:"Branches", href:"/settings/branches"},
    {label:"Users & Roles", href:"/settings/users"},
    {label:"Page Visibility Control", href:"/settings/page-access"},
  ]},
  {label:"Compliance & Workflow", children:[
    {label:"Period Locking", href:"/settings/period-lock"},
    {label:"Approval Workflow", href:"/settings/approval-workflow"},
    {label:"Pending Approvals Queue", href:"/approvals"},
    {label:"Statutory Filing Register", href:"/settings/filing-register"},
    {label:"Master Change Request Queue", href:"/settings/master-change-queue"},
    {label:"Vacation Delegations", href:"/settings/delegations"},
  ]},
  {label:"Integrations", children:[
    {label:"Banking API", href:"/settings/banking-api"},
    {label:"GSP / IRP E-Invoice", href:"/settings/gsp-irp"},
    {label:"API & Integrations", href:"/settings/integrations"},
  ]},
  {label:"Tools", children:[
    {label:"Audit Log", href:"/settings/audit"},
    {label:"Display Preferences", href:"/settings/preferences"},
  ]},
  {label:"Admin Power", children:[
    {divider:true, label:"Templates & Branding"},
    {label:"Document Template Editor", href:"/settings/doc-templates"},
    {label:"Email / SMS Templates", href:"/settings/email-templates"},
    {label:"Branding Settings", href:"/settings/branding"},
    {divider:true, label:"Approvals & Access"},
    {label:"Approval Matrix Builder", href:"/settings/approval-matrix-builder"},
    {label:"Field-Level Access Control", href:"/settings/field-access"},
    {label:"Permissions Matrix", href:"/settings/permissions-matrix"},
    {divider:true, label:"Data & Users"},
    {label:"Custom Fields Manager", href:"/settings/custom-fields"},
    {label:"Bulk User Operations", href:"/settings/bulk-users"},
  ]}
]};

/* ── ACCOUNTS — branch accountant workspace ──────────────────── */
// One operate-from-here pill for the branch accountant. Branch-scoped via the
// top-right selector. Every item below REUSES an existing route — no new screens.
//
// The groups below are ordered to follow an accountant's actual workflow, so the
// mega-panel reads left-to-right as a narrative instead of a flat dump:
//   1. ENTRY        — Daily Entry (vouchers, now segmented by voucher family)
//   2. TRANSACTIONS — Sales & Purchase · BSP & Airline registers
//   3. OUTSTANDING  — Receivables · Payables · Cash & Bank · Reconciliation
//   4. REPORTING    — Books & Scrutiny · Branch MIS (financial statements)
//   5. CLOSE/MASTER — Period Close · Accounts Master
// Dashboard Accountant / Receivables / Payables stay title-less leaves → render as
// featured pills on top. The latter two open the same Ageing & Settlement card the
// AD dashboard shows (WidgetCard + ArApSettlementView, collapsed to sub-group
// subtotals) on its own page — NOT the full drilled report at /reports/rec|pay
// (which carries its own Ageing / Settle / Net tabs).
export const MENU_ACCOUNTS = {label:"Accounts", icon:Calculator, children:[
  {label:"Dashboard Accountant", href:"/accounts/dashboard"},
  // CRM payments submitted by salespeople land here for finance to verify/reject.
  {label:"Payment Verification (CRM)", href:"/accounts/payment-verification"},
  {label:"Receivables — Ageing & Settlement", href:"/accounts/receivables-ageing-settlement"},
  {label:"Payables — Ageing & Settlement", href:"/accounts/payables-ageing-settlement"},

  /* ── 1 · ENTRY ───────────────────────────────────────────── */
  // The 13 voucher types are split by family (Sales · Receipts/Payments · Journal/
  // Expense · Refunds/Memos) so the tall column scans as labelled sub-blocks rather
  // than one undifferentiated list. "Approve & Post" → the top-level Approvals pill.
  {label:"Daily Entry", children:[
    {divider:true, label:"Sales & Inter-Branch"},
    {label:"SO/PO/GP Voucher",         href:"/bookings/new"},
    {label:"Inter-Branch (INB) Voucher", href:"/bookings/inter-branch"},
    {divider:true, label:"Receipts, Payments & Contra"},
    {label:"Receipt Voucher",          href:"/receipts"},
    {label:"Payment Voucher",          href:"/payments"},
    {label:"Contra Entry",             href:"/contra"},
    {divider:true, label:"Journal & Expense"},
    {label:"Journal Entry",            href:"/journal"},
    {label:"Purchase Expense Voucher", href:"/purchase-expense"},
    {label:"Debit Note (Purchase Return)", href:"/debit-note"},
    {divider:true, label:"Refunds, Reissue & Memos"},
    {label:"Refund (against Sale)",    href:"/finance/refund"},
    {label:"Refund Partial (against Sale)", href:"/finance/refund-partial"},
    {label:"Reissue (against Sale)",   href:"/finance/reissue"},
    {label:"ADM Voucher",              href:"/finance/adm-voucher"},
    {label:"ACM Voucher",              href:"/finance/acm-voucher"},
  ]},

  /* ── 2 · TRANSACTION REGISTERS ───────────────────────────── */
  {label:"Sales & Purchase", children:[
    {label:"Sales Register",            href:"/reports/sreg"},
    {label:"Purchase Register",         href:"/reports/preg"},
    {label:"Purchase Expense Register (PXP)", href:"/finance/purchase-expense-register"},
    // INB Sales/Purchase Registers consolidated under ACCOUNTS ▸ Inter Branch.
    // Module Sales/Purchase Register, Invoice-wise GP and Sales & GP Analytics
    // moved to the Finance pill (Finance ▸ Registers & Outstanding).
  ]},
  // Adjustment registers — refund/reissue are raised against a sale, debit note is a
  // purchase return. Each reuses the category-driven voucher register (Finance ▸ pages).
  {label:"Refunds & Returns", children:[
    {label:"Refund Register",     href:"/finance/refund-register"},
    {label:"Reissue Register",    href:"/finance/reissue-register"},
    {label:"Debit Note Register", href:"/finance/debit-note-register"},
  ]},
  {label:"BSP & Airline", children:[
    {label:"BSP Summary",             href:"/purchase/bsp-summary"},
    {label:"BSP Statement Import",    href:"/purchase/bsp-import"},
    {label:"Ticket Control Register", href:"/purchase/ticket-control"},
    {label:"ADM — Agent Debit Memos", href:"/purchase/adm"},
    {label:"ACM — Agent Credit Memos",href:"/purchase/acm"},
  ]},

  /* ── 3 · OUTSTANDING & TREASURY ──────────────────────────── */
  {label:"Receivables & Clients", children:[
    {label:"Receivables (Ageing + Settle)",     href:"/reports/rec"},
    {label:"Client Statement",                  href:"/reports/client-statement"},
    {label:"Customer 360 View",                 href:"/reports/customer-360"},
    {label:"Receipt Register",                  href:"/finance/receipt-register"},
    {label:"Collections Follow-up",             href:"/accounts/collections"},
  ]},
  {label:"Payables & Suppliers", children:[
    {label:"Payables (Ageing + Settle)",  href:"/reports/pay"},
    // Payment Run / Batch Pay removed — bulk supplier payment is disabled by
    // policy; enter payments individually (Daily Entry ▸ Payment). The screen
    // (modules/payments/paymentRun.jsx) + BE endpoint are kept for re-enable.
    {label:"Vendor Advances",             href:"/accounting/vendor-advances"},
    {label:"Payment Register",            href:"/finance/payment-register"},
    {label:"Supplier 360 View",              href:"/reports/supplier-360"},
    {label:"Net Ageing (Debtors+Creditors)", href:"/accounts/net-ageing"},
    // Supplier Reconciliation moved to the dedicated "Reconciliation" head below.
  ]},
  {label:"Cash & Bank", children:[
    {label:"Cash Book",            href:"/finance/cash-book"},
    {label:"Bank Balances",        href:"/finance/bank-balance"},
    {label:"Contra Register",      href:"/finance/contra-register"},
    // Bank Reconciliation + Reconciliation Queue moved to the "Reconciliation" head below.
  ]},
  // Reconciliation moved OUT of Accounts entirely — every reconciliation screen
  // (client / bank / supplier / inter-branch / Tally matching + the certificate
  // ladder) now lives under the top-level Reconciliation pill (MENU_RECONCILIATION).
  // Tax/GST reconciliation stays ONLY under the regime-aware Taxation pill.

  /* ── 4 · BOOKS & REPORTING ───────────────────────────────── */
  {label:"Books & Scrutiny", children:[
    {label:"Statistics",       href:"/accounts/statistics"},
    {label:"Day Book",         href:"/day-book"},
    {label:"Ledger Account",   href:"/ledger"},
    {label:"Trial Balance",    href:"/finance/trial-balance"},
    {label:"Journal Register", href:"/finance/journal-register"},
    {label:"Audit Trail",      href:"/reports/audit-trail"},
  ]},
  {label:"Branch MIS", children:[
    {label:"Profit & Loss",         href:"/reports/pnl"},
    {label:"Balance Sheet",         href:"/reports/bs"},
    {label:"Cash Position Summary", href:"/reports/cash-position"},
  ]},

  /* Inter-Branch (INB) — TWO MIRROR PIPELINES + the reports over them.
     Inter-branch trade is bidirectional: any branch sells to any other depending on where
     the price is best, so AMD→BOM is as real as BOM→AMD. Every branch therefore owns BOTH
     pipelines, and each self-scopes — Outgoing lists the deals WE sell (an INB deal's legs
     post in the SELLER's branch), Incoming lists the deals pushed TO us (InbLink.toBranch).
     One branch's Outgoing IS another's Incoming; neither screen can show the other side.
     The INB Voucher (entry) stays under Daily Entry ▸ Sales & Inter-Branch — it's a daily
     entry. Everything below the two pipelines is read-only analytics over the registry. */
  {label:"Inter Branch", children:[
    {label:"Outgoing · We Sell",        href:"/inb/outgoing"},
    {label:"Incoming · Convert",        href:"/inb/incoming"},
    {label:"Trade Matrix & Margin",     href:"/accounts/inb-matrix"},
    {label:"Register & P&L Breakdown",  href:"/accounts/inb-register"},
    {label:"Counterparty Ledger",       href:"/accounts/inb-counterparty"},
    {label:"INB Sales Register",        href:"/reports/inb-sreg"},
    {label:"INB Purchase Register",     href:"/reports/inb-preg"},
    // Inter-branch RECONCILIATION moved to the top-level Reconciliation pill.
  ]},

  /* ── 5 · PERIOD CLOSE & MASTERS ──────────────────────────── */
  {label:"Period Close", children:[
    {label:"Month-End Checklist / Day-Close", href:"/accounts/month-end"},
    {label:"Suspense / Unspecified Clearing", href:"/accounts/suspense"},
    {label:"Recurring Vouchers", href:"/accounting/recurring"},
    {label:"Year-End Close", href:"/accounting/year-close"},
  ]},
  // Accounts Master — the Chart-of-Accounts masters now live under THIS Accounts
  // header (moved out of the standalone Masters pill). Cost Centres are Super-Admin-
  // only (branch-wise master) — their writes 403 for a Branch Accountant, who can
  // still open the screen to view. Tax & Statutory moved to the Taxation header (see
  // TAX_INDIA / TAX_AFRICA / TAX_ALL in core/data.js) — no longer under Accounts.
  {label:"Accounts Master", children:[
    // Three Tally-style doors: Groups → Ledgers → Chart of Accounts (Display).
    // Groups & Sub-Groups are the SAME collection (a 3-tier tree) so they share
    // one "Groups" door; the read-only tree is the "Display" view.
    {divider:true, label:"Chart of Accounts"},
    {label:"Groups (Create / Alter / Display)", href:"/masters/groups"},
    {label:"Ledgers (Create / Alter / Display)", href:"/masters/ledgers"},
    {label:"Chart of Accounts (Tree view)", href:"/masters/accounts-tree"},
    {label:"Bank Accounts", href:"/masters/bank-accounts"},
    {divider:true, label:"Currency"},
    {label:"Currencies", href:"/masters/currency"},
    {label:"Forex Rates", href:"/masters/forex"},
    {divider:true, label:"Costing"},
    {label:"Cost Categories", href:"/masters/cost-categories"},
    {label:"Cost Centres (Super-Admin)", href:"/masters/cost-centers"},
    {divider:true, label:"Planning"},
    {label:"Budgets", href:"/masters/budgets"},
    {label:"Scenarios", href:"/masters/scenarios"},
  ]},
]};

// The Branch-Accountant view of the Accounts pill: the central-finance heads —
// Branch MIS (financial statements), Inter Branch, Period Close and Accounts
// Master (Chart of Accounts) — are stripped from the accountant surface. Nav-only:
// the routes stay reachable (they share segments with in-role pages, so the
// route-lockout deny-list can't carry them); per-page hiding/granting remains
// available via Page Visibility Control.
const ACCOUNTANT_HIDDEN_ACCOUNTS_HEADS = new Set(['Branch MIS', 'Inter Branch', 'Period Close', 'Accounts Master']);
export const MENU_ACCOUNTS_BRANCH_ACCOUNTANT = {
  ...MENU_ACCOUNTS,
  children: MENU_ACCOUNTS.children.filter((c) => !ACCOUNTANT_HIDDEN_ACCOUNTS_HEADS.has(c?.label)),
};

/* ── FINAL MENU ASSEMBLY ─────────────────────────────────────── */

/* The old MENU_TRANSACTIONS pill was deleted: it was never assembled into
   getMenu(), and every route it listed (voucher-tabs, ADM/ACM, sales
   cancellation, purchase refunds) already lives under Finance / Accounts. */

/* ── HO CONTROL CENTER ─────────────────────────────────────────── */

// MENU_HO_CONTROL (the "HO Control" section) was removed — the TK Group model has
// no Head Office (six equal peer branches). Its dead prototype screens were deleted;
// the three real entries (Statutory Filing Register, Master Change Request Queue,
// Vacation Delegations) were re-homed into MENU_SETTINGS ▸ Compliance & Workflow.


// ─── TK GROUP · central-control pill ─────────────────────────────────────────
// The REAL governance surfaces backed by /api/tk/*: your role briefing, the
// change-request approvals inbox, and the control-flag switchboard. This is the
// group's only central-control plane (the old static-prototype "HO Control" pill
// was removed). Dormant-safe — every page shows an empty / read-only state until
// core.policy_guard is switched on at go-live.

// The next two exports mirror individual dropdowns of the TK Group Central cockpit
// nav (modules/tk-group/cockpit.js → controlCockpitMenu) so Page Visibility Control
// can toggle their pages under the SAME sub-groups the live dropdown renders —
// instead of buried in the flat MENU_TK_GROUP list below (its leaves are de-duped by
// href, so whichever of these claims a route first — they're all listed ahead of
// MENU_TK_GROUP in pageCatalog.js's PREFERRED_SECTIONS — wins; see build()).

// "Approvals" dropdown. Decisions (/tk/decisions) is ALSO the MENU_DECISIONS
// top-level pill every branch role relies on to raise requests — toggling it off here
// only hides it from the cockpit dropdown, never from the branch pill (see
// pageCatalog.js's CATALOG_PILL_EXEMPT + applyHidden's per-render pill protection).
export const MENU_TK_APPROVALS = {label:"Approvals", icon:CheckSquare, children:[
  {label:"Approve", children:[
    {label:"Approvals — Vouchers", href:"/tk/voucher-approvals"},
    {label:"Admin Approval", href:"/tk/approvals"},
  ]},
  {label:"Raise / Govern", children:[
    {label:"Decisions", href:"/tk/decisions"},
    {label:"Onboarding", href:"/tk/onboarding"},
  ]},
]};

// "Control & Configuration" dropdown. ERP Rules Manager / User Control Center are
// owner-gated in the live cockpit nav (the isOwner check in cockpit.js), but stay
// listed here unconditionally like every other page — Page Visibility Control
// manages what EVERY user can see, not just owners.
export const MENU_TK_CONTROL = {label:"Control & Configuration", icon:Lock, children:[
  {label:"Control Tower", children:[
    {label:"Control Tower", href:"/tk/control-tower"},
    {label:"ERP Health Scorecard", href:"/tk/health-scorecard"},
    {label:"Control Tower — by Module", href:"/tk/modules"},
    {label:"ERP Adoption", href:"/tk/adoption"},
    {label:"Close Readiness & Integrity", href:"/tk/integrity"},
  ]},
  {label:"Power Console", children:[
    {label:"Control Panel", href:"/tk/control-panel"},
    {label:"Control Flags", href:"/tk/controls"},
    {label:"Thresholds & Limits", href:"/tk/limits"},
  ]},
  {label:"Rules & Requests", children:[
    {label:"ERP Rules Manager", href:"/tk/rules"},
    {label:"User Control Center", href:"/tk/user-rules"},
    {label:"Period Locks", href:"/tk/period-locks"},
    {label:"Targets & Budgets", href:"/tk/targets"},
    {label:"Master Control (request)", href:"/tk/master-control"},
  ]},
  {label:"Monitoring", children:[
    {label:"Branch Cockpit", href:"/tk/branch-cockpit"},
    {label:"Audit Trail", href:"/tk/audit"},
  ]},
]};

// "Administration" dropdown. Every route here is ALSO already toggleable under the
// branch-side "Admin" section's nested "Settings" group — claimed first here (listed
// ahead of MENU_ADMIN / MENU_MASTERS in pageCatalog.js's PREFERRED_SECTIONS) so the
// admin manages them grouped like the live cockpit dropdown (Users & Access /
// Organisation & Config / Templates & Integrations) instead of one flat "Settings"
// list. Users & Access is owner-gated in the live cockpit nav (the isOwner check in
// cockpit.js's administration()) but stays listed here unconditionally, same as every
// other page. Page Visibility Control's own route (/settings/page-access) is dropped
// automatically — it's in pageCatalog.js's ALWAYS_VISIBLE and can never be toggled.
// "App Access" is the same route as "Users & Roles" (mirrors cockpit.js verbatim), so
// only one toggle shows for it.
export const MENU_TK_ADMIN = {label:"Administration", icon:ShieldCheck, children:[
  {label:"Users & Access", children:[
    {label:"Users & Roles", href:"/settings/users"},
    {label:"App Access", href:"/settings/users"},
    {label:"Bulk User Operations", href:"/settings/bulk-users"},
    {label:"Page Visibility Control", href:"/settings/page-access"},
    {label:"Permissions Matrix", href:"/settings/permissions-matrix"},
    {label:"Field-Level Access", href:"/settings/field-access"},
    {label:"Approval Matrix Builder", href:"/settings/approval-matrix-builder"},
  ]},
  {label:"Organisation & Config", children:[
    {label:"Branches", href:"/settings/branches"},
    {label:"Numbering Series", href:"/masters/numbering"},
    {label:"Custom Fields", href:"/settings/custom-fields"},
    {label:"Vacation Delegations", href:"/settings/delegations"},
    {label:"Approval Workflow", href:"/settings/approval-workflow"},
    {label:"Master Change Queue", href:"/settings/master-change-queue"},
    {label:"Statutory Filing Register", href:"/settings/filing-register"},
  ]},
  {label:"Templates & Integrations", children:[
    {label:"Document Templates", href:"/settings/doc-templates"},
    {label:"Email / SMS Templates", href:"/settings/email-templates"},
    {label:"Branding", href:"/settings/branding"},
    {label:"Banking API", href:"/settings/banking-api"},
    {label:"GSP / IRP E-Invoice", href:"/settings/gsp-irp"},
    {label:"API & Integrations", href:"/settings/integrations"},
    {label:"Audit Log", href:"/settings/audit"},
  ]},
]};

// "Masters & Ledger" dropdown. Every route here is ALSO already toggleable under the
// branch-side "Accounts" (Accounts Master) and "Masters" (Client/Supplier Master)
// sections — this section deliberately claims them first (it's listed ahead of
// MENU_ACCOUNTS / MENU_MASTERS in pageCatalog.js's PREFERRED_SECTIONS) so the admin
// manages them grouped exactly like the live cockpit dropdown instead of hunting
// through the much larger Accounts/Masters lists. Same toggle, same effect either way.
export const MENU_TK_MASTERS = {label:"Masters & Ledger", icon:Database, children:[
  {label:"Chart & Ledgers", children:[
    {label:"Chart of Accounts", href:"/masters/accounts-tree"},
    {label:"Ledger Masters", href:"/masters/ledgers"},
    {label:"Account Groups", href:"/masters/groups"},
  ]},
  {label:"Party Masters", children:[
    {label:"Customers", href:"/masters/customers"},
    {label:"Suppliers", href:"/masters/suppliers"},
  ]},
]};

// "Performance & Oversight" dropdown — every route is /tk/*-only (no branch-side
// equivalent), so this is a clean claim ahead of the flat MENU_TK_GROUP fallback.
export const MENU_TK_PERFORMANCE = {label:"Performance & Oversight", icon:BarChart2, children:[
  {label:"Performance", children:[
    {label:"Branch Scorecard", href:"/tk/scorecard"},
    {label:"Performance vs Target", href:"/tk/performance"},
    {label:"Profitability", href:"/tk/profitability"},
  ]},
  {label:"Capital & Assets", children:[
    {label:"Investment & Capital", href:"/tk/investment"},
    {label:"Assets Central", href:"/tk/assets"},
    {label:"Receivables & Payables", href:"/tk/receivables-payables"},
  ]},
  {label:"Risk & Close", children:[
    {label:"Exceptions & Risk", href:"/tk/exceptions"},
    {label:"Compliance & Close", href:"/tk/compliance"},
    {label:"Central Tax Desk", href:"/tk/tax-desk"},
  ]},
]};

// "HR Control" dropdown. Governance (HR Requests) is /tk/*-only and new; HR Screens
// reuses the same branch-side HR routes as MENU_HR (Employee Master / Payroll /
// HR Reports groups) — claimed first here for the same grouped-like-the-dropdown
// reason as Masters & Ledger above (listed ahead of MENU_HR in PREFERRED_SECTIONS).
export const MENU_TK_HR = {label:"HR Control", icon:Users, children:[
  {label:"Governance", children:[
    {label:"HR Requests", href:"/tk/hr-control"},
  ]},
  {label:"HR Screens", children:[
    {label:"Employees", href:"/hr/employees"},
    {label:"Payroll", href:"/hr/payroll"},
    {label:"Attrition", href:"/hr/attrition"},
    {label:"Recruitment", href:"/hr/recruitment"},
  ]},
]};

// "Setup & Roles" dropdown — every route is /tk/*-only, same clean-claim reasoning as
// Performance & Oversight above.
export const MENU_TK_SETUP = {label:"Setup & Roles", icon:Rocket, children:[
  {label:"Setup", children:[
    {label:"Configuration Readiness", href:"/tk/readiness"},
    {label:"Go-Live", href:"/tk/go-live"},
  ]},
  {label:"Roles", children:[
    {label:"My Role", href:"/tk/my-role"},
    {label:"Roles & Responsibilities", href:"/tk/roles"},
  ]},
]};

export const MENU_TK_GROUP = {label:"TK Group", icon:Lock, children:[
  {label:"My Role", href:"/tk/my-role"},
  {label:"Roles & Responsibilities", href:"/tk/roles"},
  {label:"Control Panel", href:"/tk/control-panel"},
  {label:"Configuration Readiness", href:"/tk/readiness"},
  {label:"Go-Live", href:"/tk/go-live"},
  {divider:true, label:"Governance"},
  {label:"Approvals Inbox", href:"/tk/approvals"},
  {label:"Voucher Approvals", href:"/tk/voucher-approvals"},
  {label:"Onboarding", href:"/tk/onboarding"},
  {label:"Control Flags", href:"/tk/controls"},
  {label:"Thresholds & Limits", href:"/tk/limits"},
  {label:"Period Locks", href:"/tk/period-locks"},
  {label:"Targets & Budgets", href:"/tk/targets"},
  {label:"Master Control", href:"/tk/master-control"},
  {label:"HR Requests", href:"/tk/hr-control"},
  {divider:true, label:"Monitoring"},
  {label:"Control Tower", href:"/tk/control-tower"},
  {label:"ERP Health Scorecard", href:"/tk/health-scorecard"},
  {label:"ERP Rules Manager (Owner)", href:"/tk/rules"},
  {label:"User Control Center (Owner)", href:"/tk/user-rules"},
  {label:"Control Tower — by Module", href:"/tk/modules"},
  {label:"ERP Adoption", href:"/tk/adoption"},
  {label:"Close Readiness & Integrity", href:"/tk/integrity"},
  {label:"Branch Scorecard", href:"/tk/scorecard"},
  {label:"Performance vs Target", href:"/tk/performance"},
  {label:"Investment & Capital", href:"/tk/investment"},
  {label:"Assets Central", href:"/tk/assets"},
  {label:"Profitability", href:"/tk/profitability"},
  {label:"Receivables & Payables", href:"/tk/receivables-payables"},
  {label:"Exceptions & Risk", href:"/tk/exceptions"},
  {label:"Compliance & Close", href:"/tk/compliance"},
  {label:"Central Tax Desk", href:"/tk/tax-desk"},
  {label:"Branch Cockpit", href:"/tk/branch-cockpit"},
  {label:"Audit Trail", href:"/tk/audit"},
]};

// Reconciliation — the BRANCH surface is FREEZE-ONLY: Daily & Weekly freeze (no
// certification — that is done at TK Group Central) plus the statement-matching
// screens. Month/Quarter/Year certification and Tally Reconciliation are NOT on the
// branch surface; they live in the TK Group Central cockpit (modules/tk-group/cockpit.js).
// Branch-wise throughout.
export const MENU_RECONCILIATION = {label:"Statement Reconciliation", icon:ArrowLeftRight, children:[
  // Freeze — the per-ledger Daily & Weekly freeze register (the branch deliverable).
  // Daily: Branch Accountant freezes → AE approves. Weekly: BA freezes → AE → FM
  // approve (approvals happen at TK Group Central). No certification, no hard lock.
  {label:"Freeze", children:[
    {label:"Daily Freeze",  href:"/reconciliation/daily"},
    {label:"Weekly Freeze", href:"/reconciliation/weekly"},
  ]},
  // Reconciliation Hub — the read-only FULL VIEW / dashboard of a freeze tier:
  // every cycle ledger + its live status and the attention list.
  {label:"Reconciliation Hub", children:[
    {label:"Daily Reconciliation",  href:"/reconciliation/hub/daily"},
    {label:"Weekly Reconciliation", href:"/reconciliation/hub/weekly"},
  ]},
  // Statement matching — all line-level import/match screens live under
  // Reconciliation (tax recon stays under the regime-aware Taxation pill).
  {label:"Statement Matching", children:[
    {label:"Client Reconciliation",    href:"/accounts/client-reco"},
    {label:"Bank Reconciliation",      href:"/bank-reco"},
    {label:"Reconciliation Queue",     href:"/finance/reco-queue"},
    {label:"Supplier Reconciliation",  href:"/accounts/supplier-reco"},
    {label:"Inter-Branch Reconciliation", href:"/accounts/interbranch-reco"},
    {label:"Match Guide",              href:"/reconciliation/match-guide"},
  ]},
  // One report per freeze tier — pending freezes and open exceptions.
  {label:"Reports", children:[
    {label:"Daily Report",  href:"/reconciliation/reports/daily"},
    {label:"Weekly Report", href:"/reconciliation/reports/weekly"},
  ]},
  {label:"Govern", children:[
    {label:"Rule Book & Process", href:"/reconciliation/rulebook"},
  ]},
]};

// Tally Reconciliation — the WHOLE-BOOKS ERP↔Tally tie-out (its own top-level
// pill, distinct from Statement Reconciliation above). EVERYTHING Tally lives
// here: the tie-out board (Trial Balance upload), the per-ledger Day Book matcher
// (moved out of Statement Matching), and the staff Guide.
export const MENU_TALLY_RECON = {label:"Tally Reconciliation", icon:Scale, children:[
  // The whole-books board — the menu is the tier switch (TB upload lives inside).
  {label:"Tie-Out", children:[
    {label:"Monthly Tie-Out", href:"/tally-reconciliation/monthly"},
    {label:"Yearly Tie-Out",  href:"/tally-reconciliation/yearly"},
  ]},
  // The certification register — the "which period is certified" overview per tier
  // (status · sign chain · frozen snapshot). Sign-off ACTION lives on the board.
  {label:"Certification", children:[
    {label:"Monthly Certification", href:"/tally-reconciliation/certification/monthly"},
    {label:"Yearly Certification",  href:"/tally-reconciliation/certification/yearly"},
  ]},
  // Per-tier report: pending closings · certificate register · open blockers.
  {label:"Reports", children:[
    {label:"Monthly Report", href:"/tally-reconciliation/reports/monthly"},
    {label:"Yearly Report",  href:"/tally-reconciliation/reports/yearly"},
  ]},
  // Per-ledger voucher matcher — where the Tally Day Book is imported (feeds the
  // tie-out board's voucher drill). Route kept as /accounts/tally-reco.
  {label:"Vouchers", children:[
    {label:"Ledger Matcher (Day Book)", href:"/accounts/tally-reco"},
  ]},
  // Staff how-to for the whole Tally reconciliation flow.
  {label:"Help", children:[
    {label:"Tally Reconciliation Guide", href:"/tally-reconciliation/guide"},
  ]},
]};

// The branch Statement Reconciliation pill is already FREEZE-ONLY (Daily & Weekly)
// with no Month/Quarter/Year to hide, so the Branch-Accountant view is identical to
// the branch pill. Kept as a named export for the callers/tests that reference it.
export const MENU_RECONCILIATION_WEEKLY_ONLY = MENU_RECONCILIATION;

// One unified approval screen (SO/PO/GP + Vouchers, each Pending/Approved/Rejected/Deleted).
export const MENU_APPROVALS = {label:"Approvals", icon:CheckSquare, href:"/transactions/approvals"};

// Farhan's DECISION stream — a branch raises a credit-limit / funds-release /
// counterparty-onboarding decision; Farhan disposes smaller ones, large ones escalate
// to the Owner. A leaf pill surfaced to EVERY role (branches raise; central roles act
// via the TK Group ▸ Approvals Inbox), like Approvals/Support.
export const MENU_DECISIONS = {label:"Decisions", icon:Scale, href:"/tk/decisions"};

// In-app issue tracker — every user can raise bugs / errors / change requests and
// help triage the board while the software is under active development. A leaf pill
// (like Approvals) surfaced to EVERY role, so it's added to both branches of
// roleMenuRoots below (full menu AND the Branch-Accountant workspace).
export const MENU_SUPPORT = {label:"Support", icon:LifeBuoy, href:"/support/tickets"};

// Developer Control — the engineering status console (/dev/control): what's wired,
// partial, stub, dormant or pending across the whole ERP, plus live API checks and
// the script runbook. SUPER-ADMIN ONLY: appended in fullMenuRoots() for that role
// alone, and the route itself is role-gated in App.jsx (direct URLs blocked too).
export const MENU_DEV_CONTROL = {label:"Dev Control", icon:Wrench, href:"/dev/control"};

export const MENU_COMMON_TOP = [
  {label:"Dashboard",   icon:LayoutDashboard, href:"/dashboard"},
  MENU_FINANCE,        // finance-only items not duplicated in the Accounts pill (combined register, period-end, tools)
  MENU_APPROVALS,
];


// All Import & Export of data — Vouchers, Accounts/Chart of Accounts, Masters,
// Tally migration, BSP/GDS feeds, and every export — consolidated under ONE
// labelled section in the Admin dropdown.
export const MENU_IMPORT_EXPORT = {label:"Import / Export Data", icon:Database, children:[
  {label:"Import", children:[
    {label:"Data Import — Vouchers, Accounts & Masters", href:"/import"},
    // BSP Statement Import → Accounts ▸ BSP & Airline; GDS / PNR Import →
    // Finance ▸ BSP & Airline Memos (kept where the work is done, not duplicated).
  ]},
  {label:"Export", children:[
    {label:"Tally XML Export", href:"/reports/tally-export"},
  ]},
]};

// Back-office sections grouped under one "Admin" header pill (cleaner top bar).
// HR now has its own top-level pill (MENU_HR) — no longer nested under Admin.
export const MENU_ADMIN = {label:"Admin", icon:Lock, children:[MENU_ASSETS, MENU_SETTINGS, MENU_IMPORT_EXPORT]};
// The BRANCH surface keeps only OPERATIONAL admin — fixed-asset entry + data import.
// Org administration (Users & Roles, Permissions, Access, Config, Integrations, HO
// Control) is central: it lives in TK Group Central ▸ Administration, off the branch
// nav. Personal profile/preferences stay reachable via the avatar UserMenu.
export const MENU_ADMIN_BRANCH = {label:"Admin", icon:Lock, children:[MENU_ASSETS, MENU_IMPORT_EXPORT]};

// Director/Super-Admin only: the plain "Dashboard" pill becomes a "Dashboards"
// dropdown with the whole-company suite. Other roles keep the single Dashboard link.
export const MENU_DASHBOARDS = {label:"Dashboards", icon:LayoutDashboard, children:[
  // "AD Dashboards" (formerly "Overview") is Super-Admin-only — dashboardsFor()
  // strips this group for every other role (e.g. Director). superAdminOnly flags it.
  {label:"AD Dashboards", superAdminOnly:true, children:[
    {label:"My Dashboard", href:"/dashboard"},
    {label:"Alerts Dashboard", href:"/dashboard/alerts"},
    {label:"Capital vs Investment", href:"/dashboards/capital"},
    {label:"TGT VS Sales/GP/EX/NP", href:"/dashboards/performance"},
  ]},
  {label:"Financials", children:[
    {divider:true, label:"P&L & Growth"},
    {label:"Profitability (P&L)", href:"/dashboards/profitability"},
    {label:"YoY Growth", href:"/dashboards/yoy"},
    {divider:true, label:"Balance & Cash"},
    {label:"Balance Sheet", href:"/dashboards/balance-sheet"},
    {label:"Cash & Liquidity", href:"/dashboards/cash"},
    {label:"Cash Forecast (13-week)", href:"/dashboards/cash-forecast"},
    {divider:true, label:"Working Capital & Tax"},
    {label:"Receivables & Payables", href:"/dashboards/arap"},
    {label:"Expenses", href:"/dashboards/expenses"},
    {label:"Tax & Compliance", href:"/dashboards/tax"},
  ]},
  {label:"Business", children:[
    {label:"Sales & Bookings", href:"/dashboards/sales"},
    {label:"Module / Product GP", href:"/dashboards/module-gp"},
    {label:"Customer Value (LTV + ABC)", href:"/dashboards/customer-value"},
    {label:"Branch & Group Performance", href:"/dashboards/branch"},
    {label:"Supplier / Purchase", href:"/dashboards/supplier"},
  ]},
  {label:"Targets", children:[
    {label:"Sales vs Target", href:"/dashboards/sales-target"},
    {label:"GP vs Target", href:"/dashboards/gp-target"},
    {label:"Collections vs Target", href:"/dashboards/collections-target"},
    {label:"Budget vs Expense", href:"/dashboards/budget-expense"},
  ]},
  {label:"Control", children:[
    {label:"Approvals & Audit", href:"/dashboards/audit"},
  ]},
]};

// The Owner Dashboard (consolidated all-branch) is owner-only and REPLACES the role-scoped
// "My Dashboard" for the owner: its governance widgets now carry everything My Dashboard
// showed, so the owner sees a single home. Only the owner email gets this swap (the route is
// email-gated in App.jsx too, which also redirects /dashboard → /dashboard/owner for them).
// The owner is a Super Admin, so this group is never stripped for them (see dashboardsFor).
function withOwnerDashboard(menu){
  const overview = menu.children[0];
  const newOverview = {...overview, children:[
    {label:"AD Dashboard (All)", href:"/dashboard/owner"},   // replaces "My Dashboard" for the owner
    {label:"AD Cockpit", href:"/dashboard/cockpit"},  // sectioned dark cockpit — additive, owner-only
    ...overview.children.slice(1),                                        // Alerts, Capital, … (My Dashboard dropped)
  ]};
  return {...menu, children:[newOverview, ...menu.children.slice(1)]};
}

// The Dashboards dropdown for a role: the "AD Dashboards" group is Super-Admin-only,
// so strip any superAdminOnly-flagged group for every other full-menu role (Director).
// The owner-only Owner Dashboard link is folded in first (owner ⇒ Super Admin ⇒ kept).
export function dashboardsFor(currentUser){
  const isSuperAdmin = (currentUser?.role || 'Super Admin') === 'Super Admin';
  const menu = isOwnerDashboardUser(currentUser) ? withOwnerDashboard(MENU_DASHBOARDS) : MENU_DASHBOARDS;
  if (isSuperAdmin) return menu;
  return {...menu, children: menu.children.filter(c => !c.superAdminOnly)};
}

/* ── Per-user page visibility ─────────────────────────────────────────
   Settings → Page Visibility Control stores, per user, a deny-list of menu
   hrefs (currentUser.hidden). The helpers below strip those nodes from the
   menu the user receives — so a toggled-off page/report simply isn't in the
   nav. App.jsx applies the same deny-list as a route guard for direct URLs. */

// Drop dividers that no longer precede a real (non-divider) sibling — otherwise
// pruning a column's only links would leave a dangling section header.
function cleanDividers(children){
  const out=[];
  for(let i=0;i<children.length;i++){
    const c=children[i];
    if(!c) continue;
    if(c.divider){
      let following=false;
      for(let j=i+1;j<children.length;j++){
        if(!children[j]) continue;
        if(children[j].divider) break;
        following=true; break;
      }
      if(following) out.push(c);
    } else out.push(c);
  }
  return out;
}

// Route splits leave STALE keys in users' saved deny-lists: the combined
// Reconciliation pages became per-tier pages (2026-07), so a `hidden` entry of
// '/reconciliation' saved before the split must keep covering its replacements
// — otherwise the module silently un-hides on deploy. Symmetrically, hiding a
// replacement also blocks the legacy alias that still renders it.
const LEGACY_HIDDEN_ALIASES = {
  '/reconciliation': ['/reconciliation/weekly', '/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly'],
  '/reconciliation/reports': ['/reconciliation/reports/weekly', '/reconciliation/reports/monthly', '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly'],
  '/reconciliation/hub': ['/reconciliation/hub/weekly', '/reconciliation/hub/monthly', '/reconciliation/hub/quarterly', '/reconciliation/hub/yearly'],
};
export function expandHidden(list){
  const out = new Set(Array.isArray(list) ? list : []);
  for (const k of [...out]) (LEGACY_HIDDEN_ALIASES[k] || []).forEach((h) => out.add(h));
  // The legacy URLs render the WEEKLY pages — hiding weekly must block them too.
  if (out.has('/reconciliation/weekly')) out.add('/reconciliation');
  if (out.has('/reconciliation/reports/weekly')) out.add('/reconciliation/reports');
  if (out.has('/reconciliation/hub/weekly')) out.add('/reconciliation/hub');
  return out;
}

// Recursively remove hidden leaves; then drop any pure container left with no
// navigable leaf. A node that is itself navigable (has its own href) survives.
function pruneNode(node, hiddenSet){
  if(!node || node.divider) return node || null;
  if(node.href && hiddenSet.has(node.href)) return null;
  if(node.children){
    const kids=cleanDividers(node.children.map(c=>pruneNode(c,hiddenSet)).filter(Boolean));
    const hasLeaf=kids.some(k=>k && (k.href || (k.children && k.children.length)));
    if(!hasLeaf && !node.href) return null;
    return {...node, children:kids};
  }
  return node;
}

export function applyHidden(menus, currentUser){
  const hidden=expandHidden(currentUser?.hidden); // incl. legacy-alias coverage
  hidden.delete('/dashboard'); // landing page is never hideable (avoids lockout)
  // The visibility-control link is admin-only: hide it from everyone else, and
  // make sure the admin always keeps it (even if it slipped into their list).
  if(isPageAccessAdmin(currentUser)) hidden.delete('/settings/page-access');
  else hidden.add('/settings/page-access');
  // Protect top-level pills: the deny-list may hide a pill's INNER sub-pages but can
  // NEVER remove the pill itself. So (a) clear each top-level pill's OWN href from the
  // hidden set — a single-page pill like Approvals always stays — and (b) below, keep
  // every top-level node even if all its children are hidden (only children are pruned).
  for(const m of menus){ if(m && m.href) hidden.delete(m.href); }
  if(!hidden.size) return menus;
  return menus.map(m=>{
    if(!m) return m;
    if(m.children){
      const kids=cleanDividers(m.children.map(c=>pruneNode(c,hidden)).filter(Boolean));
      return {...m, children:kids}; // pill kept even when its dropdown ends up empty
    }
    return m; // top-level leaf pill — always shown (its href was cleared above)
  }).filter(Boolean);
}

// True when a role sees the FULL application, not the restricted Branch-Accountant
// workspace. Page Visibility Control (core/pageCatalog.js) uses this to decide
// whether to scope its catalogue + counts to the role's reachable pages.
export function hasFullMenu(currentUser){
  return !/accountant/i.test(currentUser?.role || '');
}

// Branch-regime tax section (GST / VAT / consolidated) for the given branch.
function taxSectionFor(branch){
  const isAll = branch==="ALL";
  const isIndia = !isAll && branch?.code && ["BOMMB","BOM","AMD"].includes(branch.code);
  return isAll ? TAX_ALL : isIndia ? TAX_INDIA : TAX_AFRICA;
}

// The COMPLETE pill set a full-menu role sees. Also the source tree used to place a
// restricted user's GRANTED pages (each granted page shows under its natural pill).
export function fullMenuRoots(branch, currentUser){
  const taxSection = taxSectionFor(branch);
  const role = currentUser?.role || 'Super Admin';
  const isDir = role === 'Director' || role === 'Super Admin';
  // "AD Dashboards" group is Super-Admin-only; the owner also gets the Owner Dashboard link.
  const dashboardsMenu = dashboardsFor(currentUser);
  const top = isDir ? [dashboardsMenu, MENU_FINANCE, MENU_APPROVALS] : MENU_COMMON_TOP;
  // TK Group is the central-control pill — shown ONLY to the all-branch governance
  // roles (Owner / Director / Finance Manager / Sr. Accounts Executive). Oversight-only
  // roles (GM/BM) and branch execs don't get it. Its pages stay in Page Visibility
  // Control regardless (MENU_TK_GROUP is an export the catalogue auto-discovers).
  // NOTE: the TK Group control layer is NOT a pill in the branch ERP. It's a MODE —
  // selecting "TK Group Central" in the branch selector enters the control cockpit
  // (see modules/tk-group/menu.js → getVisibleMenu). Here we only keep Decisions as a
  // branch pill so branches can RAISE credit/funds/onboarding/investment requests.
  // Dev Control is a Super-Admin-only pill — every other role never sees it
  // (and App.jsx blocks the route for them even by direct URL).
  // Tally Reconciliation is NOT on the branch surface — it is a TK Group Central
  // activity only (the cockpit carries it; the BE 403s branch-scoped tokens). The
  // branch Statement Reconciliation pill is freeze-only (Daily & Weekly).
  return [...top, MENU_DECISIONS, MENU_ACCOUNTS, MENU_RECONCILIATION, MENU_REPORTS, taxSection, MENU_MASTERS, MENU_HR, MENU_ADMIN_BRANCH, MENU_SUPPORT,
    ...(role === 'Super Admin' ? [MENU_DEV_CONTROL] : [])];
}

// The menu roots a user's ROLE exposes, BEFORE their personal hidden/granted lists.
// Page Visibility Control walks these to know which pages are in-role (defaults).
export function roleMenuRoots(branch, currentUser){
  if (hasFullMenu(currentUser)) return fullMenuRoots(branch, currentUser);
  // Branch Accountant → their self-contained Accounts workspace PLUS Approvals,
  // Decisions (they raise credit/funds/onboarding requests) and Support. Taxation
  // is central-finance work, so the pill is NOT on the accountant surface (and
  // /tax routes are locked below); individual tax pages can still be granted back
  // per-user via Page Visibility Control. The Accounts pill is the trimmed
  // accountant variant (no Branch MIS / Inter Branch / Period Close / Accounts
  // Master — see MENU_ACCOUNTS_BRANCH_ACCOUNTANT).
  // Branch scope is still enforced by the top-right switcher.
  // Reconciliation: the Branch Accountant PREPARES the weekly certificates, so
  // the module pill is part of their workspace too (AE/FM/Director sign above).
  return [MENU_ACCOUNTS_BRANCH_ACCOUNTANT, MENU_RECONCILIATION_WEEKLY_ONLY, MENU_APPROVALS, MENU_DECISIONS, MENU_SUPPORT];
}

// Keep ONLY the leaves whose href is in `keep`; drop everything else (containers with
// no surviving child are removed). Builds the sub-menu of a user's GRANTED pages.
function keepPrune(node, keep){
  if(!node || node.divider) return node || null;
  if(node.children){
    const kids=cleanDividers(node.children.map(c=>keepPrune(c,keep)).filter(Boolean));
    const hasLeaf=kids.some(k=>k && (k.href || (k.children && k.children.length)));
    if(!hasLeaf && !(node.href && keep.has(node.href))) return null;
    return {...node, children:kids};
  }
  return (node.href && keep.has(node.href)) ? node : null;
}

// Merge grant pills `b` into role menu `a` at the top level, by label. Pills unique to
// b are appended; a pill in both has b's children folded in. (Granted pages are
// out-of-role, so overlap is rare.)
function mergeMenus(a, b){
  const byLabel=new Map(); const out=a.map(p=>{ byLabel.set(p.label,p); return p; });
  for(const pill of b){
    if(!pill) continue;
    const ex=byLabel.get(pill.label);
    if(ex && ex.children && pill.children){ ex.children=cleanDividers([...ex.children, ...pill.children]); }
    else if(!ex){ out.push(pill); byLabel.set(pill.label, pill); }
  }
  return out;
}

export function getMenu(branch, currentUser){
  // Role picks the menu shape; then strip each user's hidden pages/reports.
  const roleMenu = applyHidden(roleMenuRoots(branch, currentUser), currentUser);
  if (hasFullMenu(currentUser)) return roleMenu; // full roles already see everything
  // GRANTS: pages the admin turned ON beyond the role (Page Visibility Control). Show
  // each under its natural pill (from the full tree), minus anything also hidden, and
  // merge into the role menu so it appears in nav.
  const hidden = new Set(Array.isArray(currentUser?.hidden) ? currentUser.hidden : []);
  const granted = (Array.isArray(currentUser?.granted) ? currentUser.granted : []).filter((g) => !hidden.has(g));
  if (!granted.length) return roleMenu;
  const grantMenu = fullMenuRoots(branch, currentUser).map((r) => keepPrune(r, new Set(granted))).filter(Boolean);
  return mergeMenus(roleMenu, grantMenu);
}

// Top-level route areas a RESTRICTED role (Branch Accountant) may NOT open — even by
// direct URL — beyond the nav hiding. Deliberately a DENY-list of clearly out-of-scope
// admin areas, NOT the inverse of their menu: menu leaves don't map 1:1 to routes, so
// an allow-list wrongly blocks legit accounting sub-routes (trial-balance, approvals,
// sales, assets…). Everything accounting/finance/reports/masters stays reachable;
// per-PAGE control is the hidden deny-list (Page Visibility Control).
//   hr → employees/payroll/salaries · settings → users & roles / company config ·
//   group-dashboard → group-level dashboard · tax → the Taxation pill (central
//   finance work, removed from the accountant surface; grant back per-page).
const RESTRICTED_ROLE_DENY_SEGMENTS = new Set(['hr', 'settings', 'group-dashboard', 'tax']);

// Hard route-level lockout used by App.jsx: can this user OPEN this route directly?
// Full-menu roles (Super Admin / Director / everyone who isn't an accountant) reach
// everything. Restricted roles are blocked from the out-of-scope areas above.
export function canReachRoute(route, currentUser){
  if (hasFullMenu(currentUser)) return true;
  const r = String(route || '');
  if (r === '/dashboard') return true; // landing page is never blocked (avoids lockout)
  // An explicit per-user GRANT (Page Visibility Control) overrides the role lockout —
  // e.g. granting /hr/employees lets this accountant open it directly.
  const granted = Array.isArray(currentUser?.granted) ? currentUser.granted : [];
  if (granted.includes(r)) return true;
  const seg = r.replace(/^\//, '').split('/')[0];
  return !RESTRICTED_ROLE_DENY_SEGMENTS.has(seg);
}


