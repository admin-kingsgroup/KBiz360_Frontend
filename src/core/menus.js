/* ════════════════════════════════════════════════════════════════════
   CORE/MENUS.JS
   Auto-generated from KBiz360_v2.jsx · 361 lines · 11 declarations
   ════════════════════════════════════════════════════════════════════ */

import { BarChart2, Calculator, Calendar, CheckSquare, Database, Download, LayoutDashboard, Lock, Settings, Upload, User, Users, Wallet, Wrench } from 'lucide-react';
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
    {label:"Numbering Series (🔒 auto)", href:"/masters/numbering"},
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
  ]},
  {label:"BSP & Airline Memos", children:[
    {label:"GDS / PNR Import", href:"/purchase/gds-import"},
    {label:"Sales Cancellations", href:"/sales/cancellation"},
    {label:"Purchase Refunds", href:"/purchase/refunds"},
  ]},
  {label:"Period-End, Targets & Accruals", children:[
    {divider:true, label:"Period-End"},
    {label:"Intercompany", href:"/accounting/intercompany"},
    {label:"FX Revaluation", href:"/accounting/fx-revaluation"},
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
    {label:"Multi-Currency Voucher", href:"/finance/multi-currency"},
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
    {label:"Forex Report", href:"/reports/forex"},
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
    {label:"Currency Exposure", href:"/reports/fx-exposure"},
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
    {label:"Attendance", href:"/hr/attendance"},
    {label:"Leave Management", href:"/hr/leave"},
    {label:"Recruitment", href:"/hr/recruitment"},
    {label:"Training Records", href:"/hr/training"},
  ]},
  {label:"Payroll", children:[
    {label:"Salary Run", href:"/hr/payroll"},
    {label:"Payslips", href:"/hr/payslips"},
    {label:"Salary Revision", href:"/hr/salary-revision"},
    {label:"PF/ESI Challan", href:"/hr/pf-esi"},
    {label:"Gratuity Register", href:"/hr/gratuity"},
  ]},
  {label:"Expense & Loans", children:[
    {label:"Expense Claims", href:"/hr/expenses"},
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
// Dashboard Accountant stays a title-less leaf → renders as a featured pill on top.
export const MENU_ACCOUNTS = {label:"Accounts", icon:Calculator, children:[
  {label:"Dashboard Accountant", href:"/accounts/dashboard"},

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
    {label:"Payment Run / Batch Pay",     href:"/accounts/payment-run"},
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
  // Dedicated Reconciliation head — gathers EVERY non-tax reconciliation screen in
  // one place (was previously scattered across Cash & Bank + Payables), split into
  // Client · Bank · Supplier · Inter-branch · Tally sections. Tax/GST reconciliation
  // (Tax Reco / GSTR-2B/2A/9C) lives ONLY under the regime-aware Taxation pill now —
  // it was removed from this Accounts head to avoid duplicating taxation screens.
  {label:"Reconciliation", children:[
    {divider:true, label:"Client"},
    {label:"Client Reconciliation",    href:"/accounts/client-reco"},
    {divider:true, label:"Bank"},
    {label:"Bank Reconciliation",      href:"/bank-reco"},
    {label:"Reconciliation Queue",     href:"/finance/reco-queue"},
    {divider:true, label:"Supplier"},
    {label:"Supplier Reconciliation",  href:"/accounts/supplier-reco"},
    {divider:true, label:"Tally"},
    {label:"Tally Reconciliation (ERP vs Tally)", href:"/accounts/tally-reco"},
  ]},

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

  /* Inter-Branch (INB) — all the inter-branch reports in one place. The INB
     Voucher itself stays under Daily Entry ▸ Sales & Inter-Branch (it's a daily
     entry); these are the read-only analytics over the INB Link registry. */
  {label:"Inter Branch", children:[
    {label:"Trade Matrix & Margin",     href:"/accounts/inb-matrix"},
    {label:"Register & P&L Breakdown",  href:"/accounts/inb-register"},
    {label:"INB Sales Register",        href:"/reports/inb-sreg"},
    {label:"INB Purchase Register",     href:"/reports/inb-preg"},
    {label:"Reconciliation",            href:"/accounts/interbranch-reco"},
  ]},

  /* ── 5 · PERIOD CLOSE & MASTERS ──────────────────────────── */
  {label:"Period Close", children:[
    {label:"Month-End Checklist / Day-Close", href:"/accounts/month-end"},
    {label:"Suspense / Unspecified Clearing", href:"/accounts/suspense"},
    {label:"Recurring Vouchers", href:"/accounting/recurring"},
    {label:"Year-End Close (HO)", href:"/accounting/year-close"},
  ]},
  // Accounts Master — the Chart-of-Accounts masters now live under THIS Accounts
  // header (moved out of the standalone Masters pill). Cost Centres are Super-Admin-
  // only (branch-wise master) — their writes 403 for a Branch Accountant, who can
  // still open the screen to view. Tax & Statutory moved to the Taxation header (see
  // TAX_INDIA / TAX_AFRICA / TAX_ALL in core/data.js) — no longer under Accounts.
  {label:"Accounts Master", children:[
    {divider:true, label:"Chart of Accounts"},
    {label:"Accounts Tree View (read-only)", href:"/masters/accounts-tree"},
    {label:"Chart of Accounts (Groups ▸ Ledgers)", href:"/masters/groups"},
    {label:"Groups & Sub-Groups (Create / Edit)", href:"/masters/subgroups"},
    {label:"Ledgers (Create / Edit)", href:"/masters/ledgers"},
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

/* ── FINAL MENU ASSEMBLY ─────────────────────────────────────── */

/* The old MENU_TRANSACTIONS pill was deleted: it was never assembled into
   getMenu(), and every route it listed (voucher-tabs, ADM/ACM, sales
   cancellation, purchase refunds) already lives under Finance / Accounts. */

/* ── HO CONTROL CENTER ─────────────────────────────────────────── */

export const MENU_HO_CONTROL = {label:"HO Control", icon:Settings, children:[
  {label:"Group Monthly Dashboard", href:"/ho/group-dashboard"},
  {divider:true, label:"Authority & Approvals"},
  {label:"Authority Configuration Center", href:"/settings/authority-config"},
  {label:"Master Change Request Queue", href:"/settings/master-change-queue"},
  {label:"Vacation Delegations", href:"/settings/delegations"},
  {divider:true, label:"Asset & Procurement"},
  {label:"Asset Procurement Workflow", href:"/ho/asset-procurement"},
  {divider:true, label:"Master Data Control"},
  {label:"Vendor Master Lock", href:"/ho/vendor-master-lock"},
  {label:"Banking Relationship Control", href:"/ho/banking-control"},
  {divider:true, label:"Compliance & Audit"},
  {label:"Statutory Filing Register", href:"/ho/filing-register"},
  {label:"Period Lock Control", href:"/ho/period-lock"},
  {label:"Central Audit Queue (100%)", href:"/ho/audit-queue"},
]};


// One unified approval screen (SO/PO/GP + Vouchers, each Pending/Approved/Rejected/Deleted).
export const MENU_APPROVALS = {label:"Approvals", icon:CheckSquare, href:"/transactions/approvals"};

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
export const MENU_ADMIN = {label:"Admin", icon:Lock, children:[MENU_ASSETS, MENU_HO_CONTROL, MENU_SETTINGS, MENU_IMPORT_EXPORT]};

// Director/Super-Admin only: the plain "Dashboard" pill becomes a "Dashboards"
// dropdown with the whole-company suite. Other roles keep the single Dashboard link.
export const MENU_DASHBOARDS = {label:"Dashboards", icon:LayoutDashboard, children:[
  {label:"Overview", children:[
    {label:"My Dashboard", href:"/dashboard"},
    {label:"Alerts Dashboard", href:"/dashboard/alerts"},
    {label:"Capital vs Investment", href:"/dashboards/capital"},
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

// The Owner Dashboard (consolidated all-branch) is owner-only — injected into the
// "Overview" group right under "My Dashboard", and ONLY for the owner email (the
// route itself is email-gated in App.jsx, so this just surfaces the link).
function withOwnerDashboard(menu){
  const overview = menu.children[0];
  const newOverview = {...overview, children:[
    overview.children[0],                                              // My Dashboard
    {label:"Owner Dashboard (All Branches)", href:"/dashboard/owner"},
    ...overview.children.slice(1),
  ]};
  return {...menu, children:[newOverview, ...menu.children.slice(1)]};
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

function applyHidden(menus, currentUser){
  const hidden=new Set(Array.isArray(currentUser?.hidden)?currentUser.hidden:[]);
  hidden.delete('/dashboard'); // landing page is never hideable (avoids lockout)
  // The visibility-control link is admin-only: hide it from everyone else, and
  // make sure the admin always keeps it (even if it slipped into their list).
  if(isPageAccessAdmin(currentUser)) hidden.delete('/settings/page-access');
  else hidden.add('/settings/page-access');
  if(!hidden.size) return menus;
  return menus.map(m=>pruneNode(m,hidden)).filter(Boolean);
}

export function getMenu(branch, currentUser){
  const isAll   = branch==="ALL";
  const isIndia = !isAll && branch?.code && ["BOMMB","BOM","AMD"].includes(branch.code);
  const taxSection = isAll ? TAX_ALL : isIndia ? TAX_INDIA : TAX_AFRICA;
  // Tax/GST reconciliation screens live ONLY under the Taxation pill now, so the
  // Accounts pill is the same regardless of branch regime.
  const accountsMenu = MENU_ACCOUNTS;
  // Map each top-level menu label to its PERM_MODULES group name
  const MENU_TO_GROUP = {
    "Dashboard":        null,            // always visible
    "Masters":          "Masters",
    "Transactions":     "_TXN",          // special: passes if Sales OR Purchase accessible
    "Finance":          "Finance",
    "Assets":           "Finance",
    "Taxation":         "Taxation",
    "Taxation — GST":   "Taxation",
    "Taxation — VAT":   "Taxation",
    "Reports":          "Reports",
    "HR":               "HR & Payroll",
    "Settings":         "Settings",
    "HO Control":       "Settings",
  };
  // OPEN ACCESS: every ERP user sees every menu (no role-based filtering).
  // Director/Super Admin get the multi-dashboard dropdown in place of the plain
  // Dashboard pill; everyone else keeps the single Dashboard link.
  const role = currentUser?.role || 'Super Admin';
  const isDir = role === 'Director' || role === 'Super Admin';
  const isAccountant = /accountant/i.test(role || ''); // "Branch Accountant" et al.
  // Branch Accountant → their self-contained Accounts workspace PLUS the Taxation
  // pill. The Accounts pill bundles their Dashboard, Daily-Entry vouchers, Approve
  // & Post, Sales/Purchase + Receivables/Payables + Cash/Bank registers, Books &
  // Scrutiny, quick-create Masters, Period Close and Branch MIS. Tax & Statutory now
  // lives under the Taxation header (regime-aware: GST / VAT / consolidated), so the
  // accountant gets that pill too. Branch scope is still enforced by the top-right
  // switcher (limited to their stored branches).
  if (isAccountant) return applyHidden([accountsMenu, MENU_APPROVALS, taxSection], currentUser);
  // The group owner (Super Admin + owner email) gets the extra Owner Dashboard
  // link inside the Dashboards dropdown — nobody else.
  const dashboardsMenu = isOwnerDashboardUser(currentUser) ? withOwnerDashboard(MENU_DASHBOARDS) : MENU_DASHBOARDS;
  const top = isDir ? [dashboardsMenu, MENU_FINANCE, MENU_APPROVALS] : MENU_COMMON_TOP;
  // 9 pills: Dashboard(s) · Finance · Approvals · Accounts · Reports · Taxation · Masters · HR · Admin
  const menus = [...top, accountsMenu, MENU_REPORTS, taxSection, MENU_MASTERS, MENU_HR, MENU_ADMIN];
  // Strip each user's hidden pages/reports (Settings → Page Visibility Control).
  return applyHidden(menus, currentUser);
}


