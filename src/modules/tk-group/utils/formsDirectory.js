// ── Form Directory — every data-creation form in the ERP, one flat list ──
// Hand-maintained (not derived from the router — most of these forms are a
// modal on a list page, not their own route, so there's nothing to scan).
// Add a row here whenever a new "create X" form ships; the Control Tower's
// Form Directory tab is the only consumer.

export const FORM_DIRECTORY = [
  // Vouchers & Transactions — Accounts ▸ Daily Entry
  { id: 'sopogp',        module: 'Vouchers & Transactions', name: 'SO/PO/GP Voucher',            route: '/bookings/new',            breadcrumb: 'Accounts ▸ Daily Entry ▸ Sales & Inter-Branch' },
  { id: 'inb-voucher',   module: 'Vouchers & Transactions', name: 'Inter-Branch (INB) Voucher',   route: '/bookings/inter-branch',   breadcrumb: 'Accounts ▸ Daily Entry ▸ Sales & Inter-Branch' },
  { id: 'receipt',       module: 'Vouchers & Transactions', name: 'Receipt Voucher',              route: '/receipts',                breadcrumb: 'Accounts ▸ Daily Entry ▸ Receipts, Payments & Contra' },
  { id: 'payment',       module: 'Vouchers & Transactions', name: 'Payment Voucher',              route: '/payments',                breadcrumb: 'Accounts ▸ Daily Entry ▸ Receipts, Payments & Contra' },
  { id: 'contra',        module: 'Vouchers & Transactions', name: 'Contra Entry',                 route: '/contra',                  breadcrumb: 'Accounts ▸ Daily Entry ▸ Receipts, Payments & Contra' },
  { id: 'journal',       module: 'Vouchers & Transactions', name: 'Journal Entry',                route: '/journal',                 breadcrumb: 'Accounts ▸ Daily Entry ▸ Journal & Expense' },
  { id: 'purch-exp',     module: 'Vouchers & Transactions', name: 'Purchase Expense Voucher',     route: '/purchase-expense',        breadcrumb: 'Accounts ▸ Daily Entry ▸ Journal & Expense' },
  { id: 'debit-note',    module: 'Vouchers & Transactions', name: 'Debit Note (Purchase Return)', route: '/debit-note',              breadcrumb: 'Accounts ▸ Daily Entry ▸ Journal & Expense' },
  { id: 'refund',        module: 'Vouchers & Transactions', name: 'Refund (against Sale)',        route: '/finance/refund',          breadcrumb: 'Accounts ▸ Daily Entry ▸ Refunds, Reissue & Memos' },
  { id: 'refund-partial',module: 'Vouchers & Transactions', name: 'Refund Partial (against Sale)',route: '/finance/refund-partial',  breadcrumb: 'Accounts ▸ Daily Entry ▸ Refunds, Reissue & Memos' },
  { id: 'reissue',       module: 'Vouchers & Transactions', name: 'Reissue (against Sale)',       route: '/finance/reissue',         breadcrumb: 'Accounts ▸ Daily Entry ▸ Refunds, Reissue & Memos' },
  { id: 'adm',           module: 'Vouchers & Transactions', name: 'ADM Voucher',                  route: '/finance/adm-voucher',     breadcrumb: 'Accounts ▸ Daily Entry ▸ Refunds, Reissue & Memos' },
  { id: 'acm',           module: 'Vouchers & Transactions', name: 'ACM Voucher',                  route: '/finance/acm-voucher',     breadcrumb: 'Accounts ▸ Daily Entry ▸ Refunds, Reissue & Memos' },
  { id: 'recurring',     module: 'Vouchers & Transactions', name: 'New Recurring Template',       route: '/accounting/recurring',    breadcrumb: 'Accounts ▸ Period Close ▸ Recurring Vouchers' },

  // Masters
  { id: 'm-groups',    module: 'Masters', name: 'Groups (Chart of Accounts)',    route: '/masters/groups',            breadcrumb: 'Accounts ▸ Accounts Master ▸ Groups' },
  { id: 'm-ledgers',   module: 'Masters', name: 'Ledgers',                       route: '/masters/ledgers',           breadcrumb: 'Accounts ▸ Accounts Master ▸ Ledgers' },
  { id: 'm-costcat',   module: 'Masters', name: 'Cost Categories',               route: '/masters/cost-categories',   breadcrumb: 'Accounts ▸ Accounts Master ▸ Cost Categories' },
  { id: 'm-budgets',   module: 'Masters', name: 'Budgets',                       route: '/masters/budgets',           breadcrumb: 'Accounts ▸ Accounts Master ▸ Budgets' },
  { id: 'm-scenarios', module: 'Masters', name: 'Scenarios',                     route: '/masters/scenarios',         breadcrumb: 'Accounts ▸ Accounts Master ▸ Scenarios' },
  { id: 'm-customers', module: 'Masters', name: 'Customers (Sundry Debtors)',    route: '/masters/customers',         breadcrumb: 'Masters ▸ Client Master ▸ Clients' },
  { id: 'm-suppliers', module: 'Masters', name: 'Suppliers (Sundry Creditors)',  route: '/masters/suppliers',         breadcrumb: 'Masters ▸ Supplier Master ▸ Suppliers' },
  { id: 'm-credit',    module: 'Masters', name: 'Credit Facilities & Limits',    route: '/masters/credit-facilities', breadcrumb: 'Masters ▸ Supplier Master ▸ Credit Facilities & Limits' },
  { id: 'm-vtypes',    module: 'Masters', name: 'Voucher Types',                 route: '/masters/voucher-types',     breadcrumb: 'Masters ▸ Voucher Master ▸ Voucher Types' },
  { id: 'm-subagents', module: 'Masters', name: 'Sub-Agents',                    route: '/masters/sub-agents',        breadcrumb: 'Masters ▸ Supplier Master ▸ Sub-Agents' },
  { id: 'm-passports', module: 'Masters', name: 'Passport Register',             route: '/masters/passports',         breadcrumb: 'Masters ▸ Utilities ▸ Passport Register' },
  { id: 'm-tax',       module: 'Masters', name: 'Tax / HSN-SAC Codes',           route: '/masters/tax',               breadcrumb: 'Masters ▸ Tax Master ▸ Tax / HSN-SAC Codes' },
  { id: 'm-airlines',  module: 'Masters', name: 'Airlines & GDSs',               route: '/masters/airlines',          breadcrumb: 'Masters ▸ Inventory & Catalog Master ▸ Airlines & GDSs' },
  { id: 'm-hotels',    module: 'Masters', name: 'Hotels & DMCs',                 route: '/masters/hotels',            breadcrumb: 'Masters ▸ Inventory & Catalog Master ▸ Hotels & DMCs' },
  { id: 'm-seats',     module: 'Masters', name: 'Seat Inventory',                route: '/masters/seats',             breadcrumb: 'Masters ▸ Inventory & Catalog Master ▸ Seat Inventory' },
  { id: 'm-tourcodes', module: 'Masters', name: 'Tour Codes',                    route: '/masters/tour-codes',        breadcrumb: 'Masters ▸ Inventory & Catalog Master ▸ Tour Codes' },
  { id: 'm-projects',  module: 'Masters', name: 'Projects',                      route: '/masters/projects',          breadcrumb: 'Masters ▸ Inventory & Catalog Master ▸ Project / Tour Code Master' },
  { id: 'm-markup',    module: 'Masters', name: 'Markup Rate Sheet',             route: '/masters/markup',            breadcrumb: 'Masters ▸ Inventory & Catalog Master ▸ Service Charge - 2 Rates' },
  { id: 'm-forex',     module: 'Masters', name: 'Forex Rates',                   route: '/masters/forex',             breadcrumb: 'Accounts ▸ Accounts Master ▸ Forex Rates' },

  // HR
  { id: 'hr-employee',  module: 'HR', name: 'New Employee',                    route: '/hr/employees',       breadcrumb: 'HR ▸ Employee Master' },
  { id: 'hr-shift',     module: 'HR', name: 'New Shift',                      route: '/hr/shifts',          breadcrumb: 'HR ▸ Operations ▸ Shift Master' },
  { id: 'hr-leave',     module: 'HR', name: 'Apply for Leave (admin-side)',   route: '/hr/leave',           breadcrumb: 'HR ▸ Operations ▸ Leave Management' },
  { id: 'hr-holiday',   module: 'HR', name: 'Add Holiday',                    route: '/hr/attendance',      breadcrumb: 'HR ▸ Operations ▸ Attendance' },
  { id: 'hr-job',       module: 'HR', name: 'Post Job',                       route: '/hr/recruitment',     breadcrumb: 'HR ▸ Operations ▸ Recruitment' },
  { id: 'hr-salary',    module: 'HR', name: 'Salary Revision',                route: '/hr/salary-revision', breadcrumb: 'HR ▸ Payroll ▸ Salary Revision' },
  { id: 'hr-loan',      module: 'HR', name: 'Disburse Loan (advance)',        route: '/hr/loans-advances',  breadcrumb: 'HR ▸ Expense & Loans' },
  { id: 'hr-exp-ledger',module: 'HR', name: 'Add Expense Ledger',             route: '/expense/budget',     breadcrumb: 'Finance ▸ Period-End, Targets & Accruals ▸ Expense Budget' },
  { id: 'hr-leave-apply',module:'HR', name: 'Leave Application (self-service)',route:'/hr/leave-apply',     breadcrumb: 'HR ▸ Self-Service ▸ Requests' },
  { id: 'hr-claim',     module: 'HR', name: 'Submit Claim (reimbursement)',   route: '/hr/reimbursement',   breadcrumb: 'HR ▸ Self-Service ▸ Requests' },

  // Finance
  { id: 'fin-loan',  module: 'Finance', name: 'Add Loan',       route: '/accounting/loans',   breadcrumb: 'Finance ▸ Period-End, Targets & Accruals ▸ Loan / EMI Register' },
  { id: 'fin-invest',module: 'Finance', name: 'Add Investment', route: '/finance/investments', breadcrumb: 'Finance ▸ Period-End, Targets & Accruals ▸ Investment Register' },

  // Assets
  { id: 'asset-add', module: 'Assets', name: 'Add Asset', route: '/assets/register', breadcrumb: 'Admin ▸ Assets ▸ Fixed Asset Register' },

  // Settings
  { id: 'set-user',       module: 'Settings', name: 'Add User',                 route: '/settings/users',                 breadcrumb: 'Settings ▸ Organization ▸ Users & Roles' },
  { id: 'set-workflow',   module: 'Settings', name: 'Approval Workflow Rule',   route: '/settings/approval-workflow',     breadcrumb: 'Settings ▸ Compliance & Workflow' },
  { id: 'set-delegation', module: 'Settings', name: 'Create Delegation',        route: '/settings/delegations',           breadcrumb: 'Settings ▸ Compliance & Workflow ▸ Vacation Delegations' },
  { id: 'set-field',      module: 'Settings', name: 'Add Custom Field',         route: '/settings/custom-fields',         breadcrumb: 'Settings ▸ Admin Power ▸ Custom Fields Manager' },
  { id: 'set-matrix',     module: 'Settings', name: 'Approval Matrix Rule',     route: '/settings/approval-matrix-builder',breadcrumb: 'Settings ▸ Admin Power ▸ Approval Matrix Builder' },
  { id: 'set-template',   module: 'Settings', name: 'New Email / SMS Template', route: '/settings/email-templates',       breadcrumb: 'Settings ▸ Admin Power ▸ Email / SMS Templates' },

  // Reports
  { id: 'rpt-schedule', module: 'Reports', name: 'New Schedule',             route: '/reports/scheduled',        breadcrumb: 'Reports ▸ Report Tools ▸ Scheduled Email Reports' },
  { id: 'rpt-view',     module: 'Reports', name: 'Save as View',             route: '/reports/builder',          breadcrumb: 'Reports ▸ Report Tools ▸ Custom Report Builder' },
  { id: 'rpt-cashline', module: 'Reports', name: 'Add Expected Cash Line',   route: '/reports/cashflow-forecast',breadcrumb: 'Reports ▸ Working Capital ▸ Cash Flow Forecast 90d' },

  // Taxation
  { id: 'tax-duedate', module: 'Taxation', name: 'Add Statutory Due Date', route: '/tax/calendar', breadcrumb: 'Taxation ▸ Auto-Prep Tools ▸ Tax Calendar' },

  // TK Group
  { id: 'tk-decision',   module: 'TK Group', name: 'Raise a Decision',                route: '/tk/decisions',  breadcrumb: 'TK Group ▸ Approvals ▸ Raise / Govern' },
  { id: 'tk-rule',       module: 'TK Group', name: 'New Rule (ERP Rules Manager)',    route: '/tk/rules',      breadcrumb: 'TK Group ▸ Control & Configuration ▸ Rules & Requests' },
  { id: 'tk-user-rule',  module: 'TK Group', name: 'New Rule (User Control Center)',  route: '/tk/user-rules', breadcrumb: 'TK Group ▸ Control & Configuration ▸ Rules & Requests' },

  // Support
  { id: 'support-ticket', module: 'Support', name: 'Raise a Support Ticket', route: '/support/tickets', breadcrumb: 'Modal on /support/tickets — "Raise Ticket" button' },

  // Bulk creation — special case, not a single-record form
  { id: 'bulk-import', module: 'Bulk Import', name: 'Data Import', route: '/import', breadcrumb: 'Admin ▸ Import / Export Data ▸ Import', bulk: true },
];

export const FORM_DIRECTORY_MODULES = [...new Set(FORM_DIRECTORY.map((f) => f.module))];
