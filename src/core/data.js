/* ════════════════════════════════════════════════════════════════════
   CORE/DATA.JS
   Auto-generated from KBiz360_v2.jsx · 1103 lines · 56 declarations
   ════════════════════════════════════════════════════════════════════ */

import { FileText } from 'lucide-react';
import { BRANCHES, BRANCH_CODES, CURRENCY_META, FX_RATES, ACTIVE_CURRENCIES, VAT_RATE } from './referenceCache';

function vDate(){
  const d=new Date();
  return String(d.getDate()).padStart(2,"0")+String(d.getFullYear()).slice(-2);
}

/* ── Branches, currencies & FX rates — now DB-backed ─────────────────
   These used to be hardcoded here. They now live in MongoDB and are served via
   the API (/api/branches, /api/app-config/currencies). They're held in the
   synchronous reference cache (hydrated once at bootstrap by ReferenceProvider)
   and re-exported here so the dozens of existing call-sites — including
   synchronous ones like FX_RATES[code] and Object.keys(CURRENCY_META) — keep
   working unchanged.
     India  (TKHO/BOM/AMD): INR
     Kenya  (NBO):     USD (main) + KES
     Tanzania (DAR):   USD (main) + TZS
     DR Congo (FBM):   USD (main) + CDF
   `toINR` is the rate used for consolidated (Group) reporting only.
   ─────────────────────────────────────────────────────────────────── */
export { BRANCHES, BRANCH_CODES, CURRENCY_META, FX_RATES, ACTIVE_CURRENCIES, VAT_RATE };

/* The ONE display label for the consolidated, all-branch view (branch === 'ALL').
   Imported by every screen that shows the current scope so the wording can never
   drift between modules. The underlying selector value stays the string 'ALL'. */
export const CONSOLIDATED_LABEL = 'Travkings Group (All Branches)';

const _branchObj=(b)=> (b && typeof b==="object") ? b
  : BRANCHES.find(x=>x.code===b) || null;

/** Allowed currencies for a branch (object, code, or "ALL"). Main currency first. */
export function branchCurrencies(b){
  if(b==="ALL"||b?.code==="ALL") return Object.keys(CURRENCY_META); // consolidated → all
  const obj=_branchObj(b);
  if(obj?.currencies?.length) return obj.currencies;
  if(obj?.currency) return [obj.currency];
  return ["INR"];
}

/** Main/default currency for a branch. */
export function branchMainCurrency(b){
  if(b==="ALL"||b?.code==="ALL") return "INR";
  return branchCurrencies(b)[0] || "INR";
}

/** Display symbol for a currency code. */
export function currencySymbol(code){ return CURRENCY_META[code]?.symbol || code || ""; }

/* ── Per-branch data ─────────────────────────────────────────────────
   Each branch is fully independent: own books.
   ─────────────────────────────────────────────────────────────────── */

export const _VNO_COUNTERS={};

/* Seed: each branch starts its own sequence independently */

export const _VNO_SEED={
  BOM:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1,RF:1,RI:1},
  AMD:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1,RF:1,RI:1},
};


export function genVNo(branch,pfx){
  const brCode=branch==="ALL"?"CONS":(branch?.code||"BOM");
  const key=brCode+"_"+pfx;
  if(_VNO_COUNTERS[key]===undefined){
    _VNO_COUNTERS[key]=(_VNO_SEED[brCode]&&_VNO_SEED[brCode][pfx])||1;
  }
  const seq=_VNO_COUNTERS[key]++;
  return brCode+"/"+vDate()+"/"+pfx+String(seq).padStart(5,"0");
}

/* One-shot hook: generate voucher number once on mount, stable on re-renders */

export const TAX_INDIA = {label:"Taxation — GST", icon:FileText, _regime:"GST", children:[
  /* — Returns — */
  {divider:true, label:"GST Returns"},
  {label:"GSTR-1  Outward Supplies", href:"/tax/gstr1"},
  {label:"GSTR-3B Summary Return",   href:"/tax/gstr3b"},
  /* — Reconciliation — all GST recon screens gathered under one head (mirrors the
     dedicated "Reconciliation" head under the Accounts pill for bank/supplier). — */
  {divider:true, label:"Reconciliation"},
  {label:"GSTR-2B Reconciliation (ITC)", href:"/tax/gstr2b"},
  {label:"GSTR-2A Reconciliation",       href:"/tax/gstr2a"},
  {label:"GSTR-9C — Audit Reco",         href:"/tax/gstr9c"},
  {label:"Tax Reco (3B/1/TDS vs Books)", href:"/tax/reconciliation"},
  /* — TDS — */
  {divider:true, label:"TDS / TCS"},
  {label:"TDS & TCS Register",        href:"/tax/tds"},
  {label:"Form 26AS", href:"/tax/form26as", icon:"📑"},
          {label:"E-Way Bill", href:"/tax/eway", icon:"📦"},
          {label:"TDS Certificates (16A)", href:"/tax/tds-certs"},
  {label:"RCM Register",              href:"/tax/rcm"},
  /* — Compliance — */
  {divider:true, label:"Compliance"},
  {label:"E-Invoice & IRN",           href:"/tax/einvoice"},
  {label:"Compliance Calendar",       href:"/tax/calendar"},
  {label:"Tax Audit 3CD",           href:"/tax/audit-3cd"},
  {divider:true, label:"Auto-Prep Tools"},
  {label:"GSTR-1 Auto-Prep", href:"/tax/gstr-1-prep"},
  {label:"GSTR-3B Auto-Prep", href:"/tax/gstr-3b-prep"},
  {label:"Form 16A Generator", href:"/tax/form-16a"},
  {label:"Tax Calendar & Reminders", href:"/tax/calendar"},
  /* — Tax & Statutory (moved here from the Accounts pill) — */
  {divider:true, label:"Tax & Statutory"},
  {label:"GST / VAT Summary (Return)", href:"/reports/tax-summary"},
  {label:"TDS Auto-Calculator",        href:"/finance/tds-calculator"},
  {label:"Statutory Dues Calendar",    href:"/reports/statutory-dues"},
  {label:"Tax Filing Status Board",    href:"/reports/tax-board"},
]};

/* ── TAXATION — AFRICA VAT ───────────────────────────────────── */

export const TAX_AFRICA = {label:"Taxation — VAT", icon:FileText, _regime:"VAT", children:[
  {divider:true, label:"VAT Returns"},
  {label:"VAT Return (Monthly)",      href:"/tax/vat"},
  {label:"Withholding Tax",           href:"/tax/tds"},
  {divider:true, label:"Reconciliation"},
  {label:"VAT Return vs Books",       href:"/tax/reconciliation"},
  {divider:true, label:"Compliance"},
  {label:"Compliance Calendar",       href:"/tax/calendar"},
  /* — Tax & Statutory (moved here from the Accounts pill) — */
  {divider:true, label:"Tax & Statutory"},
  {label:"GST / VAT Summary (Return)", href:"/reports/tax-summary"},
  {label:"TDS Auto-Calculator",        href:"/finance/tds-calculator"},
  {label:"Statutory Dues Calendar",    href:"/reports/statutory-dues"},
  {label:"Tax Filing Status Board",    href:"/reports/tax-board"},
]};

/* ── TAXATION — TRAVKINGS GROUP ─────────────────────────────────── */

export const TAX_ALL = {label:"Taxation", icon:FileText, _regime:"ALL", children:[
  {divider:true, label:"India — GST"},
  {label:"GSTR-1",                    href:"/tax/gstr1"},
  {label:"GSTR-3B",                   href:"/tax/gstr3b"},
  {label:"GSTR-2B Recon",             href:"/tax/gstr2b"},
  {label:"Tax Reco (3B/1/TDS/VAT vs Books)", href:"/tax/reconciliation"},
  {label:"TDS / TCS",                 href:"/tax/tds"},
  {label:"TDS Certificates (16A)",    href:"/tax/tds-certs"},
  {label:"RCM Register",              href:"/tax/rcm"},
  {label:"E-Invoice & IRN",           href:"/tax/einvoice"},
  {divider:true, label:"Africa — VAT"},
  {label:"VAT Return",                href:"/tax/vat"},
  {label:"Withholding Tax (WHT)",     href:"/tax/tds"},
  {divider:true, label:"Travkings Group"},
  {label:"Compliance Calendar",       href:"/tax/calendar"},
  /* — Tax & Statutory (moved here from the Accounts pill) — */
  {divider:true, label:"Tax & Statutory"},
  {label:"GST / VAT Summary (Return)", href:"/reports/tax-summary"},
  {label:"TDS Auto-Calculator",        href:"/finance/tds-calculator"},
  {label:"Statutory Dues Calendar",    href:"/reports/statutory-dues"},
  {label:"Tax Filing Status Board",    href:"/reports/tax-board"},
]};

/* ── REPORTS ─────────────────────────────────────────────────── */

export const MOD_DATA=[];

export const MIX=[];

export const CASH=[];

/* Salespeople — synced from CRM. Used on every sale/purchase voucher to match transactions back to a CRM owner. */
export const SALESPEOPLE=[]; /* moved to DB — fetch via API/hook */

export const CUSTOMERS=[];

export const BOOKINGS=[]
/* ── Ticket registry — for unmatched ticket detection ─────────────
   SALES_TICKETS: every flight ticket raised on a sales voucher
   PURCH_TICKETS: every ticket entered on a purchase / BSP voucher
   Matching key: ticket number (unique per IATA ticket)
   ─────────────────────────────────────────────────────────────── */

export const SALES_TICKETS=[];


export const PURCH_TICKETS=[];

/* ══ Shared utility functions & style constants ══════════════════ */

/* Number formatter */

export const MODULE_ICONS={
  Flight:"✈",Holiday:"🌴",Hotel:"🏨",Car:"🚗",
  Visa:"🛂",Insurance:"🛡",Misc:"📦",
};

/* Booking status styles */

export const PURCHASE_REGISTRY={ PF:[], PH:[], PHT:[], PC:[], PV:[], PI:[], PM:[] };


export const SALE_TO_PURCH_MOD={SF:"PF",SH:"PH",SHT:"PHT",SC:"PC",SV:"PV",SI:"PI",SM:"PM"};

/* ══ TWO-LAYER UNMATCHED SYSTEM ══════════════════════════════════
   Layer 1 — Prevention: PurchaseLinkField dropdown at creation
     → on Save with link: marks purchase settled:true
     → removed from Available list immediately
   Layer 2 — Detection: retrospective panel on Dashboard
     → Source A: PURCHASE_REGISTRY entries still settled:false
     → Source B: _UNLINKED_SALES (sales saved without linking)
   ════════════════════════════════════════════════════════════════ */


export const _UNLINKED_SALES=[];

export const _SAVE_LISTENERS=new Set();

export const _MOD_KEY={Flight:"PF",Holiday:"PH",Hotel:"PHT",Car:"PC",Visa:"PV",Insurance:"PI",Misc:"PM"};

export const REC_D=[];

export const GP_BILLS=[];


/* ══ ReportGP — 11 tabs ══════════════════════════════════════════ */

export const EXP_LEDGERS=[]; /* moved to DB — fetch via API/hook */


export const FY_LIST=[]; /* moved to DB — fetch via API/hook */


export const _EXP_BUDGETS={};

export const _EXP_BGT_LISTENERS=new Set();

/* ── Pre-seed budgets for all branches — FY 2025-26 & 2026-27 ── */
/* budget seed removed — budgets are DB-backed (/api/expense-budgets) */



export const EXP_ACTUALS=[];

/* ── Pre-seed budgets for all branches ── */
/* budget seed removed — budgets are DB-backed (/api/expense-budgets) */

/* ══════════════════════════════════════════════════════════════════
   EXPENSE BUDGET SCREEN
   ════════════════════════════════════════════════════════════════ */

export const HR_EMPLOYEES_DATA=[];


export const HR_DEPTS=["All","Operations","Sales","Accounts","IT","HR & Admin"];

export const HR_BRANCHES_F=["All","TKHO","BOM","AMD","NBO","DAR","FBM"];

/* ── Employee Master ──────────────────────────────────────────── */

export const BRANCH_FULL_DATA=[]; /* moved to DB — fetch via API/hook */


export const ACTION_LABELS={view:"View",create:"Create",edit:"Edit",delete:"Delete",approve:"Approve",print:"Print",export:"Export"};

export const ACTION_CLR={view:"#185FA5",create:"#27500A",edit:"#854F0B",delete:"#A32D2D",approve:"#1D9E75",print:"#384677",export:"#5a6691"};

export const _USERS_DATA=[]; /* moved to DB — fetch via API/hook */

/* ════════════════════════════════════════════════════════════════
   SETTINGS → USERS & ROLES  /settings/users
   ════════════════════════════════════════════════════════════════ */



export const FOREX_RATES_DATA=[];

/* ── Proforma / Quote store ─── */

export const NOTIFICATIONS_DATA=[];

/* ── Notification store ─── */

export const ADM_REASON_CODES={}; /* moved to DB — fetch via API/hook */

/* ── ACM Reason Codes ── */

export const ADM_DATA=[];

/* ── ACM Sample Data ── */

export const LEDGER_REGISTRY=[]; /* moved to DB — fetch via API/hook */

/* ── TDS SECTION REFERENCE ──────────────────────────────────── */

export const ROUTE_TITLES={
  "/dashboard":            "Dashboard",
  "/reports/pnl-tally":    "Profit & Loss — Tally View",
  "/reports/pnl-modulewise": "Profit & Loss — Module GP",
  "/reports/bs-tally":       "Balance Sheet — Tally View",
  "/reports/bs-modulewise":  "Balance Sheet — Grouped",
  "/bookings/new":         "SO / PO / GP Voucher",
  "/bookings/pending":     "SO / PO / GP — Pending Approval",
  "/bookings/approved":    "SO / PO / GP — Approved & Posted",
  "/bookings/rejected":    "SO / PO / GP — Rejected",
  "/bookings/deleted":     "SO / PO / GP — Deleted (view only)",
  "/bookings/list":        "SO / PO / GP — Approved & Posted",
  "/sales/flight":         "Sales — Flight Tickets",
  "/sales/holiday":        "Sales — Holiday Packages",
  "/sales/hotel":          "Sales — Hotels",
  "/sales/car":            "Sales — Car Rentals",
  "/sales/visa":           "Sales — Visas",
  "/sales/insurance":      "Sales — Insurance",
  "/sales/misc":           "Sales — Miscellaneous",
  "/sales/credit-note":    "Sales — Credit Notes",
  "/purchase/flight":      "Purchase — Flight Tickets",
  "/purchase/holiday":     "Purchase — Holiday Packages",
  "/purchase/hotel":       "Purchase — Hotels",
  "/purchase/visa":        "Purchase — Visas",
  "/purchase/car":         "Purchase — Car Rentals",
  "/purchase/insurance":   "Purchase — Insurance",
  "/purchase/misc":        "Purchase — Miscellaneous",
  "/receipts":             "Receipt Voucher",
  "/payments":             "Payment Voucher",
  "/contra":               "Contra Voucher",
  "/bank-reco":            "Bank Reconciliation",
  "/journal":              "Journal Entry",
  "/debit-note":           "Debit Note",
  "/finance/credit-note":  "Credit Note",
  "/finance/debit-note":   "Debit Note",
  "/day-book":             "Day Book",
  "/ledger":               "Ledger Account",
  "/trial-balance":        "Trial Balance",
  "/tax/gstr1":            "GSTR-1 — Outward Supplies",
  "/tax/gstr3b":           "GSTR-3B — Monthly Return",
  "/tax/tds":              "TDS / TCS Register",
  "/tax/rcm":              "RCM Register",
  "/tax/vat":              "VAT Return",
  "/tax/einvoice":         "E-Invoice & IRN",
  "/reports/pnl":          "Profit & Loss Report",
  "/reports/bs":           "Balance Sheet",
  "/reports/cf":           "Cash Flow Statement",
  "/reports/rec":          "Receivables",
  "/reports/pay":          "Payables",
  "/reports/sreg":         "Sales Register",
  "/reports/branch":       "Branch Comparison",
  "/reports/pkg":          "Package P&L",
  "/reports/gp":           "Gross Profit Reports",
  "/reports/sales-gp-analytics": "Sales & GP Analytics",
  "/sales/debit-note":      "Debit Notes — Additional Charges",
  "/sales/cancellation":    "Cancellation Register",
  "/purchase/refunds":      "Refund Tracking",
  "/purchase/adm":          "ADM Register — Agent Debit Memos",
  "/purchase/acm":          "ACM Register — Agent Credit Memos",
  "/purchase/bsp-summary":  "BSP Settlement Summary",
  "/masters/sub-agents":    "Sub-Agent Master",
  "/masters/forex":         "Forex Exchange Rates",
  "/reports/commission":    "Commission Income Register",
  "/search":                "Global Search",
  "/group-dashboard":       "Group Executive Dashboard — Travkings Group",
  "/tax/calendar":          "Tax Compliance Calendar",
  "/hr/leave":              "Leave Management",
  "/hr/expenses":           "Employee Expense Claims",
  "/settings/preferences":  "Display Preferences",
  "/reports/mis":            "MIS Report — Management Information System",
  "/reports/concentration":  "Client Concentration Risk",
  "/reports/consolidated-bs":"Consolidated Balance Sheet — Travkings Group",
  "/reports/cashflow-forecast":"Cash Flow Forecast — 90 Days",
  "/reports/supplier-360":   "Supplier 360° View",
  "/reports/customer-360":   "Customer 360° View",
  "/reports/tally-export":   "Tally XML Export",
  "/masters/passports":      "Passport & Document Manager",
  "/masters/markup":         "Service Charge - 2 / Net Rate Sheet",
  "/masters/vendor-terms":   "Vendor Payment Terms",
  "/purchase/ticket-control":"Air Ticket Control Register",
  "/purchase/bsp-import":    "BSP CSV Import & Reconciliation",
  "/purchase/gds-import":    "GDS PNR Import",
  "/tax/gstr2b":             "GSTR-2B Reconciliation",
  "/tax/tds-certs":          "TDS Certificate Register — Form 16A",
  "/hr/salary-revision":     "Salary Revision Tracker",
  "/expense/budget":        "Expense Budget — Monthly & Yearly Ledger-wise",
  "/reports/exp-bgt":       "Expense Budget vs Actual Report",
  "/hr/employees":         "Employee Master",
  "/hr/attendance":        "Attendance Register",
  "/hr/payroll":           "Salary Run — Payroll Processing",
  "/hr/payslips":          "Payslips",
  "/settings/company":     "Company Profile & Legal Details",
  "/settings/branches":    "Branch Configuration",
  "/settings/users":       "Users & Roles",
  "/settings/audit":       "Audit Log",
  "/accounts/statistics":  "Statistics",
  "/masters/groups":       "Chart of Accounts",
  "/masters/ledgers":      "Masters — Ledgers",
  "/masters/customers":    "Masters — Customers",
  "/masters/suppliers":    "Masters — Suppliers",
  "/masters/airlines":     "Masters — Airlines & Consolidators",
  "/masters/hotels":       "Masters — Hotels & DMCs",
  "/masters/tax":          "Masters — Tax Rates",
};



export const LOAN_REGISTER = [];


export const EMP_LOANS_DATA = [];


export const NUMBERING_SERIES_DATA = []; /* moved to DB — fetch via API/hook */

/* ─── Shared style helpers (reused inside masters) ───────────────── */


export const FY_TARGETS_DATA = [];


export const KEY_ALERTS_DATA = [];


export const CASH_FORECAST_13W = [];


export const HR_STATS_DATA = { totalHeadcount:0, changeThisMonth:0, attendancePct:0, pendingLeave:0, payrollStatus:"", openPositions:0, birthdays:[], anniversaries:[] };


export const INTERBRANCH_ELIMINATIONS = [];


export const YIELD_BY_DESTINATION = [];


export const YIELD_BY_CONSULTANT = [];


export const YIELD_BY_SUPPLIER = [];


export const YOY_PL = [];


export const LEAVE_UTILIZATION = [];


export const TAX_FILING_BOARD = [];


export const TAX_CALENDAR_EVENTS = []; /* moved to DB — fetch via API/hook */

/* ── SUB-AGENTS MASTER ──────────────────────────────────────────────
   Single source of truth for the sub-agent list. Used by the Sub-Agents
   Master screen (masters.jsx) AND the Sub-Agent Commission Statement
   (helpers.jsx). Kept here so the statement screen can't reference an
   undeclared `SUBAGENTS` (which previously crashed the page). */
export const SUBAGENTS = [];   // demo data removed — populate from live sub-agent master

/* ════════════════════════════════════════════════════════════════════
   10. GSTR-1 AUTO-PREP
   ════════════════════════════════════════════════════════════════════ */
