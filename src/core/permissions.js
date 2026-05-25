/* ════════════════════════════════════════════════════════════════════
   CORE/PERMISSIONS.JS
   Auto-generated from KBiz360_v2.jsx · 211 lines · 3 declarations
   ════════════════════════════════════════════════════════════════════ */

export const ACTIONS=["view","create","edit","delete","approve","print","export"];

export const SPECIAL_TOGGLES=[
  {id:"see_cost",      label:"See supplier cost price",     desc:"Can view purchase cost in vouchers and GP reports",      risk:"HIGH"},
  {id:"see_gp_pct",   label:"See GP% and gross profit",    desc:"Can view margin, GP amount, and profitability reports",   risk:"HIGH"},
  {id:"see_salaries", label:"See salary & payroll data",   desc:"Can view payslips, salary amounts, payroll summaries",   risk:"HIGH"},
  {id:"approve_high", label:"Approve vouchers > ₹50,000",  desc:"Can approve high-value sales/purchase vouchers",          risk:"MED"},
  {id:"override_cl",  label:"Override client credit limit",desc:"Can create invoice when client is over credit limit",     risk:"MED"},
  {id:"approve_exp",  label:"Approve employee expenses",   desc:"Can approve expense claims submitted by team",            risk:"MED"},
  {id:"approve_leave",label:"Approve leave requests",      desc:"Can approve or reject leave applications",                risk:"LOW"},
  {id:"delete_any",   label:"Delete any record",           desc:"Can permanently delete vouchers, masters, logs",          risk:"HIGH"},
  {id:"edit_locked",  label:"Edit locked/posted vouchers", desc:"Can modify vouchers after they have been finalized",      risk:"HIGH"},
  {id:"own_only",     label:"Own bookings only",           desc:"Can only see bookings/enquiries they personally created", risk:"LOW"},
  {id:"export_data",  label:"Bulk data export",            desc:"Can export any table/report to CSV or Excel",             risk:"MED"},
  {id:"intercompany", label:"Intercompany transactions",   desc:"Can record and view cross-branch transactions",           risk:"MED"},
];

export const PERM_MODULES=[
  {group:"Masters",      icon:"🗄",  mods:[
    {id:"clients",      label:"Clients"},
    {id:"suppliers",    label:"Suppliers"},
    {id:"airlines",     label:"Airlines & GDSs"},
    {id:"hotels",       label:"Hotels & DMCs"},
    {id:"subagents",    label:"Sub-Agents"},
    {id:"forex",        label:"Forex Rates"},
    {id:"passports",    label:"Passport Register"},
    {id:"markup",       label:"Markup Rates"},
    {id:"vendorterms",  label:"Vendor Terms"},
    {id:"taxcodes",     label:"Tax / SAC Codes"},
  ]},
  {group:"Sales",        icon:"🛒",  mods:[
    {id:"s_flight",     label:"Sales — Flight"},
    {id:"s_holiday",    label:"Sales — Holiday"},
    {id:"s_hotel",      label:"Sales — Hotel"},
    {id:"s_visa",       label:"Sales — Visa"},
    {id:"s_car",        label:"Sales — Car"},
    {id:"s_insurance",  label:"Sales — Insurance"},
    {id:"s_misc",       label:"Sales — Misc"},
    {id:"s_proforma",   label:"Proforma / Quote"},
    {id:"s_creditnote", label:"Credit Notes"},
    {id:"s_debitnote",  label:"Debit Notes"},
    {id:"s_cancel",     label:"Cancellations"},
    {id:"s_targets",    label:"Sales Targets"},
  ]},
  {group:"Purchase",     icon:"🛍",  mods:[
    {id:"p_flight",     label:"Purchase — Flight"},
    {id:"p_holiday",    label:"Purchase — Holiday"},
    {id:"p_hotel",      label:"Purchase — Hotel"},
    {id:"p_visa",       label:"Purchase — Visa"},
    {id:"p_car",        label:"Purchase — Car"},
    {id:"p_insurance",  label:"Purchase — Insurance"},
    {id:"p_misc",       label:"Purchase — Misc"},
    {id:"p_refunds",    label:"Refunds Tracking"},
    {id:"p_adm",        label:"ADM Register"},
    {id:"p_acm",        label:"ACM Register"},
    {id:"p_bsp",        label:"BSP Settlement"},
    {id:"p_tktctrl",    label:"Ticket Control"},
    {id:"p_bspimport",  label:"BSP CSV Import"},
    {id:"p_gdsimp",     label:"GDS / PNR Import"},
  ]},
  {group:"Finance",      icon:"💰",  mods:[
    {id:"receipts",     label:"Receipt Vouchers"},
    {id:"payments",     label:"Payment Vouchers"},
    {id:"contra",       label:"Contra Entry"},
    {id:"bankreco",     label:"Bank Reconciliation"},
    {id:"journal",      label:"Journal Entry"},
    {id:"daybook",      label:"Day Book"},
    {id:"ledger",       label:"Ledger Account"},
    {id:"trialbal",     label:"Trial Balance"},
    {id:"expbudget",    label:"Expense Budget"},
  ]},
  {group:"Taxation",     icon:"📋",  mods:[
    {id:"gstr1",        label:"GSTR-1"},
    {id:"gstr3b",       label:"GSTR-3B"},
    {id:"gstr2b",       label:"GSTR-2B Recon"},
    {id:"tds",          label:"TDS / TCS Register"},
    {id:"tdscerts",     label:"TDS Certificates"},
    {id:"rcm",          label:"RCM Register"},
    {id:"einvoice",     label:"E-Invoice / IRN"},
    {id:"vat",          label:"VAT Return (Africa)"},
    {id:"taxcal",       label:"Compliance Calendar"},
  ]},
  {group:"Reports",      icon:"📊",  mods:[
    {id:"r_gp",         label:"GP Reports (Multi-view)"},
    {id:"r_pnl",        label:"P&L Statement"},
    {id:"r_bs",         label:"Balance Sheet"},
    {id:"r_cf",         label:"Cash Flow Statement"},
    {id:"r_consbs",     label:"Consolidated BS"},
    {id:"r_cff",        label:"Cash Flow Forecast"},
    {id:"r_mis",        label:"MIS Report"},
    {id:"r_grpdash",    label:"Group Dashboard"},
    {id:"r_client360",  label:"Client 360°"},
    {id:"r_supp360",    label:"Supplier 360°"},
    {id:"r_conc",       label:"Concentration Risk"},
    {id:"r_sreg",       label:"Sales Register"},
    {id:"r_branch",     label:"Branch Comparison"},
    {id:"r_comm",       label:"Commission Report"},
    {id:"r_tgt",        label:"TGT vs Achievement"},
    {id:"r_expbgt",     label:"Expense BGT vs ACT"},
    {id:"r_tally",      label:"Tally Export"},
    {id:"r_send",       label:"Send to Client"},
  ]},
  {group:"CRM",          icon:"🎯",  mods:[
    {id:"crm_enq",      label:"Enquiry Pipeline"},
    {id:"crm_visa",     label:"Visa Pipeline"},
  ]},
  {group:"HR & Payroll", icon:"👥",  mods:[
    {id:"hr_emp",       label:"Employee Master"},
    {id:"hr_att",       label:"Attendance"},
    {id:"hr_payroll",   label:"Salary Run / Payroll"},
    {id:"hr_payslip",   label:"Payslips"},
    {id:"hr_leave",     label:"Leave Management"},
    {id:"hr_expense",   label:"Expense Claims"},
    {id:"hr_salrev",    label:"Salary Revision"},
  ]},
  {group:"Settings",     icon:"⚙",  mods:[
    {id:"st_company",   label:"Company Profile"},
    {id:"st_branches",  label:"Branch Configuration"},
    {id:"st_users",     label:"Users & Roles"},
    {id:"st_audit",     label:"Audit Log"},
    {id:"st_prefs",     label:"Display Preferences"},
  ]},
];

/* ── SPECIAL TOGGLES ──────────────────────────────────────────── */

const buildPerms=(actions_for_group)=>{
  const p={};
  PERM_MODULES.forEach(grp=>{
    grp.mods.forEach(mod=>{
      p[mod.id]={};
      ACTIONS.forEach(a=>{ p[mod.id][a]=false; });
      const allowed=actions_for_group[grp.group]||actions_for_group["*"]||[];
      allowed.forEach(a=>{ p[mod.id][a]=true; });
    });
  });
  return p;
};

export const ROLE_TEMPLATES={
  "Super Admin":{
    color:"#A32D2D",bg:"#FCEBEB",
    desc:"Full access to all modules, all branches, all settings",
    branches:"ALL",
    perms:buildPerms({"*":ACTIONS}),
    special:SPECIAL_TOGGLES.reduce((o,t)=>({...o,[t.id]:true}),{}),
  },
  "Director":{
    color:"#3C1B14",bg:"#F5EAE3",
    desc:"Founder / Promoter / Owner-operator. Final authority on all matters. Approves > ₹25L. Signs annual financials. Cross-entity strategic decisions. Can override anyone including Sr. FM",
    branches:"ALL",
    perms:buildPerms({"*":ACTIONS}),
    special:{see_cost:true,see_gp_pct:true,see_salaries:true,approve_high:true,
             override_cl:true,approve_exp:true,approve_leave:true,delete_any:true,
             edit_locked:true,own_only:false,export_data:true,intercompany:true},
  },
  "Senior Finance Manager":{
    color:"#0d1326",bg:"#E6E8F1",
    desc:"TKHO senior-most finance authority (CFO-equivalent). Reports directly to Director. Approves all vouchers ₹2L–₹25L. Owns: Travkings Group consolidation, year-end period locks, GSTR-9 / ITR sign-off, audit liaison, capex approval, master data oversight. Below Director only",
    branches:"ALL",
    perms:buildPerms({
      "Masters":     ["view","create","edit","delete","print","export"],
      "Sales":       ["view","create","edit","delete","approve","print","export"],
      "Purchase":    ["view","create","edit","delete","approve","print","export"],
      "Finance":     ["view","create","edit","delete","approve","print","export"],
      "Taxation":    ["view","create","edit","approve","print","export"],
      "Reports":     ["view","print","export"],
      "HR & Payroll":["view","approve","export"],
      "Settings":    ["view","create","edit","delete","export"],
    }),
    special:{see_cost:true,see_gp_pct:true,see_salaries:true,approve_high:true,
             override_cl:true,approve_exp:true,approve_leave:true,delete_any:true,
             edit_locked:true,own_only:false,export_data:true,intercompany:true},
  },
  "Sr. Accounts Executive":{
    color:"#6B4C8B",bg:"#F0EBF6",
    desc:"TKHO secondary finance role (reports to Sr. Finance Manager · supervises branch Accounts Executives). Full access all branches. Approves vouchers > ₹50K. Monthly close. Cannot unlock periods · no settings edit · no delete on locked items · no high-value approval > ₹2L",
    branches:"ALL",
    perms:buildPerms({
      "Masters":     ["view","create","edit","print","export"],
      "Sales":       ["view","create","edit","approve","print","export"],
      "Purchase":    ["view","create","edit","approve","print","export"],
      "Finance":     ["view","create","edit","approve","print","export"],
      "Taxation":    ["view","create","edit","print","export"],
      "Reports":     ["view","print","export"],
      "HR & Payroll":["view","export"],
      "Settings":    ["view"],
    }),
    special:{see_cost:true,see_gp_pct:true,see_salaries:false,approve_high:false,
             override_cl:false,approve_exp:true,approve_leave:false,delete_any:false,
             edit_locked:false,own_only:false,export_data:true,intercompany:true},
  },
  "Accounts Executive":{
    color:"#2F7A8E",bg:"#E1F0F4",
    desc:"Branch-scoped Maker role. Posts vouchers in OWN BRANCH ONLY (cannot self-approve). NO access to other branches' data or Travkings Group consolidated view. View-only Taxation and Reports. No settings, no master edits, no delete",
    branches:"ASSIGNED",
    perms:buildPerms({
      "Masters":     ["view"],
      "Sales":       ["view","create","edit","print","export"],
      "Purchase":    ["view","create","edit","print","export"],
      "Finance":     ["view","create","edit","print","export"],
      "Taxation":    ["view","print"],
      "Reports":     ["view","print","export"],
      "HR & Payroll":[],
      "Settings":    [],
    }),
    special:{see_cost:true,see_gp_pct:true,see_salaries:false,approve_high:false,
             override_cl:false,approve_exp:false,approve_leave:false,delete_any:false,
             edit_locked:false,own_only:false,export_data:true,intercompany:false},
  },
  "HR Manager":{
    color:"#384677",bg:"#f3f4f8",
    desc:"Full HR access. Basic financial view only",
    branches:"ASSIGNED",
    perms:buildPerms({
      "Masters":     ["view"],
      "Sales":       [],
      "Purchase":    [],
      "Finance":     ["view"],
      "Taxation":    [],
      "Reports":     ["view"],
      "CRM":         [],
      "HR & Payroll":["view","create","edit","approve","print","export"],
      "Settings":    [],
    }),
    special:{see_cost:false,see_gp_pct:false,see_salaries:true,approve_high:false,
             override_cl:false,approve_exp:true,approve_leave:true,delete_any:false,
             edit_locked:false,own_only:false,export_data:true,intercompany:false},
  },
};

/* ── USERS DATA ───────────────────────────────────────────────── */

export const PERM_MODULES_P2 = ["Dashboard","Masters","Transactions","Finance","Reports","Taxation","HR & Payroll","Settings","Assets"];
