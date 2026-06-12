/* ════════════════════════════════════════════════════════════════════
   CORE/MENUS.JS
   Auto-generated from KBiz360_v2.jsx · 361 lines · 11 declarations
   ════════════════════════════════════════════════════════════════════ */

import { BarChart2, Calendar, CheckSquare, Database, Download, LayoutDashboard, Lock, Settings, ShoppingCart, Upload, User, Users, Wallet, Wrench } from 'lucide-react';
import { TAX_AFRICA, TAX_ALL, TAX_INDIA } from './data';
import { Recruitment } from './helpers';
import { PERM_MODULES } from './permissions';
import { getRole } from './referenceCache';
import { Dashboard } from '../modules/dashboard';

// Organised on Tally's master taxonomy: Accounts Info · Statutory Info ·
// Parties (which in Tally are just ledgers) · Inventory & Catalog · Utilities.
export const MENU_MASTERS = {label:"Masters", icon:Database, children:[
  {label:"Accounts Master", children:[
    {label:"Accounts Tree View (Parent ▸ Group ▸ Sub-Group ▸ Ledger)", href:"/masters/accounts-tree"},
    {divider:true, label:"Create / Edit"},
    {label:"Parent Groups (28 Tally · view)", href:"/masters/groups"},
    {label:"Groups & Sub-Groups (Create)", href:"/masters/subgroups"},
    {label:"Ledgers (Create · Chart of Accounts)", href:"/masters/ledgers"},
    {label:"Bank Accounts", href:"/masters/bank-accounts"},
    {label:"Cost Categories", href:"/masters/cost-categories"},
    {label:"Cost Centres", href:"/masters/cost-centers"},
    {label:"Budgets", href:"/masters/budgets"},
    {label:"Scenarios", href:"/masters/scenarios"},
  ]},
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
  {label:"Tax & Currency Master", children:[
    {label:"Tax / HSN-SAC Codes", href:"/masters/tax"},
    {label:"Currencies", href:"/masters/currency"},
    {label:"Forex Rates", href:"/masters/forex"},
  ]},
  {label:"Inventory & Catalog Master", children:[
    {label:"Airlines & GDSs", href:"/masters/airlines"},
    {label:"Hotels & DMCs", href:"/masters/hotels"},
    {label:"Tour Codes", href:"/masters/tour-codes"},
    {label:"Project / Tour Code Master", href:"/masters/projects"},
    {label:"Seat Inventory", href:"/masters/seats"},
    {label:"Markup Rates", href:"/masters/markup"},
  ]},
  {label:"HR Master", children:[
    {label:"Employee Master", href:"/hr/employees"},
    {label:"Employee — 10-Tab View", href:"/hr/employee-tabs"},
  ]},
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

export const MENU_FINANCE = {label:"Finance", icon:Wallet, children:[
  {label:"Voucher Entry", children:[
    {label:"SO/PO/GP Voucher", href:"/bookings/new"},
    {label:"Receipt Voucher", href:"/receipts"},
    {label:"Payment Voucher", href:"/payments"},
    {label:"Contra Entry", href:"/contra"},
    {label:"Journal Entry", href:"/journal"},
    {label:"Credit Note", href:"/finance/credit-note"},
    {label:"Debit Note", href:"/finance/debit-note"},
    {label:"Purchase Expense Voucher", href:"/purchase-expense"},
    {label:"Refund (against Sale)", href:"/finance/refund"},
    {label:"Reissue (against Sale)", href:"/finance/reissue"},
  ]},
  {label:"Registers & Outstanding", children:[
    {label:"Module Sales Register", href:"/finance/module-sales-register"},
    {label:"Module Purchase Register", href:"/finance/module-purchase-register"},
    {label:"Module Sales & Purchase Register", href:"/finance/module-register"},
    {label:"Outstanding & On-Account (Bill Settlement)", href:"/finance/outstanding"},
  ]},
  {label:"Books", children:[
    {label:"Day Book", href:"/day-book"},
    {label:"Cash Book", href:"/finance/cash-book"},
    {label:"Ledger Account", href:"/ledger"},
    {label:"Trial Balance", href:"/trial-balance"},
    {label:"Bank Reconciliation", href:"/bank-reco"},
  ]},
  {label:"BSP & Airline Memos", children:[
    {label:"BSP Summary", href:"/purchase/bsp-summary"},
    {label:"BSP Statement Import", href:"/purchase/bsp-import"},
    {label:"Ticket Control Register", href:"/purchase/ticket-control"},
    {label:"GDS / PNR Import", href:"/purchase/gds-import"},
    {label:"ADM — Agent Debit Memos", href:"/purchase/adm"},
    {label:"ACM — Agent Credit Memos", href:"/purchase/acm"},
    {label:"Sales Cancellations", href:"/sales/cancellation"},
    {label:"Purchase Refunds", href:"/purchase/refunds"},
  ]},
  {label:"Period-End, Targets & Accruals", children:[
    {label:"Year-End Close", href:"/accounting/year-close"},
    {label:"Recurring Vouchers", href:"/accounting/recurring"},
    {label:"Intercompany", href:"/accounting/intercompany"},
    {label:"FX Revaluation", href:"/accounting/fx-revaluation"},
    {label:"Sales Targets", href:"/finance/targets"},
    {label:"Expense Budget", href:"/expense/budget"},
    {label:"Vendor Advances", href:"/accounting/vendor-advances"},
    {label:"Loan / EMI Register", href:"/accounting/loans"},
    {label:"Investment Register", href:"/finance/investments"},
  ]},
  {label:"Tools & Calculators", children:[
    {label:"Payment Verification", href:"/finance/verification"},
    {label:"Bank Balance Dashboard", href:"/finance/bank-balance"},
    {label:"Reconciliation Queue", href:"/finance/reco-queue"},
    {label:"TDS Auto-Calculator", href:"/finance/tds-calculator"},
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
  {label:"Financial Statements", children:[
    {label:"Profit & Loss", href:"/reports/pnl"},
    {label:"Profit & Loss — Module GP", href:"/reports/pnl-modulewise"},
    {label:"Report Viewer (9-Tab View)", href:"/reports/viewer"},
    {label:"Cash Position Summary", href:"/reports/cash-position"},
    {label:"Inter-branch Elimination", href:"/reports/interbranch"},
    {label:"Notes to Financial Statements", href:"/reports/fs-notes"},
    {label:"Audit Trail Report", href:"/reports/audit-trail"},
    {label:"Balance Sheet", href:"/reports/bs"},
    {label:"Balance Sheet — Grouped", href:"/reports/bs-modulewise"},
    {label:"Cash Flow Statement", href:"/reports/cf"},
    {label:"Schedule III Balance Sheet", href:"/reports/schedule3-bs"},
    {label:"Consolidated BS", href:"/reports/consolidated-bs"},
  ]},
  {label:"Profitability & GP", children:[
    {label:"Sales & GP Analytics", href:"/reports/sales-gp-analytics"},
    {label:"Invoice-wise GP (by Link No)", href:"/reports/invoice-gp"},
    {label:"GP Reports (Multi-view)", href:"/reports/gp"},
    {label:"Yield by Destination", href:"/reports/yield-destination"},
    {label:"Yield by Consultant", href:"/reports/yield-consultant"},
    {label:"Yield by Supplier (Cost Variance)", href:"/reports/yield-supplier"},
    {label:"Year-over-Year Comparison", href:"/reports/yoy"},
    {label:"Customer LTV", href:"/reports/customer-ltv"},
    {label:"ABC Analysis (Pareto)", href:"/reports/abc-analysis"},
    {label:"Package P&L", href:"/reports/package-pl"},
    {label:"Branch Comparison", href:"/reports/branch"},
    {label:"MIS One-Pager", href:"/reports/mis"},
    {label:"Group Dashboard", href:"/group-dashboard"},
  ]},
  {label:"Operational", children:[
    {label:"Sales Register", href:"/reports/sreg"},
    {label:"Purchase Register", href:"/reports/preg"},
    {label:"Consultant Report", href:"/reports/consultant"},
    {label:"Supplier 360 View", href:"/reports/supplier-360"},
    {label:"Destination Intel", href:"/reports/destination"},
    {label:"Forex Report", href:"/reports/forex"},
    {label:"Commission Income", href:"/reports/commission"},
    {label:"Client Statement", href:"/reports/client-statement"},
  ]},
  {label:"Working Capital", children:[
    {label:"Receivables Ageing", href:"/reports/rec"},
    {label:"Payables Ageing", href:"/reports/pay"},
    {label:"Cash Flow Forecast 90d", href:"/reports/cashflow-forecast"},
    {label:"Working Capital Dashboard", href:"/reports/working-capital"},
    {label:"Ratio Analysis", href:"/reports/ratios"},
  ]},
  {label:"Compliance & Tax", children:[
    {label:"Variance Analysis", href:"/reports/variance"},
    {label:"GST / VAT Summary (Return)", href:"/reports/tax-summary"},
    {label:"Statutory Dues Calendar", href:"/reports/statutory-dues"},
    {label:"Tax Filing Status Board", href:"/reports/tax-board"},
    {label:"Currency Exposure", href:"/reports/fx-exposure"},
    {label:"Budget vs Actual", href:"/reports/budget"},
    {label:"Expense Budget vs Actual", href:"/reports/exp-bgt"},
    {label:"Tally XML Export", href:"/reports/tally-export"},
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

export const MENU_HR = {label:"HR & Payroll", icon:Users, children:[
  {label:"People", children:[
    {label:"Employee Master", href:"/hr/employees"},
    {label:"Employee (10-Tab View)", href:"/hr/employee-tabs"},
    {label:"Attendance", href:"/hr/attendance"},
    {label:"Leave Management", href:"/hr/leave"},
    {label:"Leave Utilization Report", href:"/hr/leave-utilization"},
    {label:"Recruitment", href:"/hr/recruitment"},
    {label:"Training Records", href:"/hr/training"},
    {label:"Attrition Report", href:"/hr/attrition"},
    {label:"Birthday & Anniversary Calendar", href:"/hr/calendar"},
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
  {label:"Self-Service", children:[
    {label:"Employee Portal", href:"/hr/portal"},
    {label:"Leave Application", href:"/hr/leave-apply"},
    {label:"Reimbursement Claim", href:"/hr/reimbursement"},
    {label:"My Payslip", href:"/hr/my-payslip"},
    {label:"Investment Declaration", href:"/hr/investment-declaration"},
    {label:"Form 16 (Download)", href:"/hr/form-16"},
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
    {label:"Document Template Editor", href:"/settings/doc-templates"},
    {label:"Email / SMS Templates", href:"/settings/email-templates"},
    {label:"Approval Matrix Builder", href:"/settings/approval-matrix-builder"},
    {label:"Custom Fields Manager", href:"/settings/custom-fields"},
    {label:"Field-Level Access Control", href:"/settings/field-access"},
    {label:"Bulk User Operations", href:"/settings/bulk-users"},
    {label:"Permissions Matrix", href:"/settings/permissions-matrix"},
    {label:"Branding Settings", href:"/settings/branding"},
  ]}
]};

/* ── FINAL MENU ASSEMBLY ─────────────────────────────────────── */

export const MENU_TRANSACTIONS = {label:"Transactions", icon:ShoppingCart, children:[
  /* SO/PO/GP Voucher creation now lives under Finance ▸ Vouchers; all approvals
     (SO/PO/GP + Vouchers) live in the top-level "Approvals" section. */
  /* Standardized 8-tab Voucher Entry pattern */
  {label:"Standardized Patterns", children:[
    {label:"Voucher Entry (8-Tab View)", href:"/transactions/voucher-tabs"},
  ]},
  /* Per-module Sale/Purchase ENTRY retired — all 7 products are entered via SO/PO/GP
     (Finance ▸ Vouchers ▸ SO/PO/GP Voucher) and VIEWED via Finance ▸ Module Register. */
  {label:"Airline Memos", children:[
    {label:"ADM — Agent Debit Memos", href:"/purchase/adm"},
    {label:"ACM — Agent Credit Memos", href:"/purchase/acm"},
  ]},
  {label:"Cancellations & Refunds", children:[
    {label:"Sales Cancellations", href:"/sales/cancellation"},
    {label:"Purchase Refunds", href:"/purchase/refunds"},
  ]},
]};

/* ── HO CONTROL CENTER ─────────────────────────────────────────── */

export const MENU_HO_CONTROL = {label:"HO Control", icon:Settings, children:[
  {label:"Group Monthly Dashboard", href:"/ho/group-dashboard"},
  {divider:true, label:"Authority & Approvals"},
  {label:"⭐ Authority Configuration Center", href:"/settings/authority-config"},
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
  MENU_FINANCE,        // entry hub (SO/PO/GP + all vouchers + module registers + books)
  MENU_APPROVALS,
];


// All Import & Export of data — Vouchers, Accounts/Chart of Accounts, Masters,
// Tally migration, BSP/GDS feeds, and every export — consolidated under ONE
// labelled section in the Admin dropdown.
export const MENU_IMPORT_EXPORT = {label:"Import / Export Data", icon:Database, children:[
  {label:"Import", children:[
    {label:"Data Import — Vouchers, Accounts & Masters", href:"/import"},
    {label:"BSP Statement Import", href:"/purchase/bsp-import"},
    {label:"GDS / PNR Import", href:"/purchase/gds-import"},
  ]},
  {label:"Export", children:[
    {label:"Tally XML Export", href:"/reports/tally-export"},
  ]},
]};

// Back-office sections grouped under one "Admin" header pill (cleaner top bar).
export const MENU_ADMIN = {label:"Admin", icon:Lock, children:[MENU_HR, MENU_ASSETS, MENU_HO_CONTROL, MENU_SETTINGS, MENU_IMPORT_EXPORT]};

// Director/Super-Admin only: the plain "Dashboard" pill becomes a "Dashboards"
// dropdown with the whole-company suite. Other roles keep the single Dashboard link.
export const MENU_DASHBOARDS = {label:"Dashboards", icon:LayoutDashboard, children:[
  {label:"Overview", children:[
    {label:"Executive Overview", href:"/dashboards/exec"},
    {label:"My Dashboard", href:"/dashboard"},
  ]},
  {label:"Financials", children:[
    {label:"Profitability (P&L)", href:"/dashboards/profitability"},
    {label:"Balance Sheet", href:"/dashboards/balance-sheet"},
    {label:"Cash & Liquidity", href:"/dashboards/cash"},
    {label:"Receivables & Payables", href:"/dashboards/arap"},
    {label:"Outstanding & On-Account", href:"/finance/outstanding"},
    {label:"Expenses", href:"/dashboards/expenses"},
    {label:"Tax & Compliance", href:"/dashboards/tax"},
  ]},
  {label:"Business", children:[
    {label:"Sales & Bookings", href:"/dashboards/sales"},
    {label:"Module / Product GP", href:"/dashboards/module-gp"},
    {label:"Branch Performance", href:"/dashboards/branch"},
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

export function getMenu(branch, currentUser){
  const isAll   = branch==="ALL";
  const isIndia = !isAll && branch?.code && ["BOM","AMD"].includes(branch.code);
  const taxSection = isAll ? TAX_ALL : isIndia ? TAX_INDIA : TAX_AFRICA;
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
    "HR & Payroll":     "HR & Payroll",
    "Settings":         "Settings",
    "HO Control":       "Settings",
  };
  // OPEN ACCESS: every ERP user sees every menu (no role-based filtering).
  // Director/Super Admin get the multi-dashboard dropdown in place of the plain
  // Dashboard pill; everyone else keeps the single Dashboard link.
  const role = currentUser?.role || 'Super Admin';
  const isDir = role === 'Director' || role === 'Super Admin';
  const top = isDir ? [MENU_DASHBOARDS, MENU_FINANCE, MENU_APPROVALS] : MENU_COMMON_TOP;
  // 7 pills: Dashboard(s) · Finance · Approvals · Reports · Taxation · Masters · Admin
  const menus = [...top, MENU_REPORTS, taxSection, MENU_MASTERS, MENU_ADMIN];
  return menus;
}


