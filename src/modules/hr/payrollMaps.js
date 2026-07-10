/* Pure mapping between the server-side payroll engine's DTOs
   (/api/payroll-runs/register · /payslips · /challans — see the backend
   features/hr/payroll.controller) and the field names the HR payroll screens
   render. The register/payslip numbers are COMPUTED AND PERSISTED SERVER-SIDE
   (config-driven statutory rates); the frontend is a renderer. Kept separate
   from legacy.jsx so the wiring contract is unit-testable. */

// Server register line → the row shape HrPayroll / PfEsiChallan render.
export function fromPayrollLineDTO(l = {}) {
  return {
    id: l.empId || '',
    name: l.empName || '',
    dept: l.department || '',
    desig: l.designation || '',
    basic: +l.basic || 0, hra: +l.hra || 0, da: +l.da || 0,
    travel: +l.travel || 0, medical: +l.medical || 0,
    special: +l.special || 0, gross: +l.gross || 0,
    lwpDays: +l.lwpDays || 0, lwpDed: +l.lwpDed || 0,
    empPF: +l.pfEmployee || 0, empPFr: +l.pfEmployer || 0, eps: +l.eps || 0,
    esiEligible: !!l.esiEligible, empESI: +l.esiEmployee || 0, empESIr: +l.esiEmployer || 0,
    profTax: +l.profTax || 0, tds: +l.tds || 0,
    totalDeductions: +l.totalDeductions || 0, net: +l.net || 0,
    month: l.month || '', branch: l.branch || '',
  };
}

// Server totals block → the totals shape the register footer/KPIs use.
export function payrollTotalsFromDTO(t = {}) {
  return {
    gross: +t.gross || 0, basic: +t.basic || 0, hra: +t.hra || 0, special: +t.special || 0,
    empPF: +t.pfEmployee || 0, empPFr: +t.pfEmployer || 0, eps: +t.eps || 0,
    empESI: +t.esiEmployee || 0, empESIr: +t.esiEmployer || 0,
    profTax: +t.profTax || 0, lwpDed: +t.lwpDed || 0, tds: +t.tds || 0,
    net: +t.net || 0,
    esiEligibleCount: +t.esiEligibleCount || 0,
    headcount: +t.headcount || 0,
  };
}

// Statutory deposit due date for a salary month: 15th of the FOLLOWING month.
export function challanDueDate(month) {
  const y = parseInt(String(month).slice(0, 4), 10);
  const m = parseInt(String(month).slice(5, 7), 10) + 1;
  if (!y || !m) return '';
  const yy = m > 12 ? y + 1 : y;
  const mm = m > 12 ? 1 : m;
  return `${yy}-${String(mm).padStart(2, '0')}-15`;
}

/* ── Self-service identity resolution ─────────────────────────────
   The self-service pages (/hr/portal, /hr/leave-apply, /hr/my-payslip,
   /hr/form-16) are scoped to the LOGGED-IN user: their email (from the
   'kb360-user' localStorage mirror — same pattern as isApprover in core/api)
   is matched, case-insensitively, against the employee master's email. */

export function emailOfUser(u) {
  return String((u && (u.email || u.username)) || '').trim();
}

export function currentUserEmail() {
  try {
    return emailOfUser(JSON.parse(localStorage.getItem('kb360-user') || 'null'));
  } catch { return ''; }
}

// Case-insensitive email match over fromEmpDTO-shaped rows. No email → no match.
export function matchEmployeeByEmail(employees = [], email) {
  const needle = String(email || '').trim().toLowerCase();
  if (!needle) return null;
  return employees.find((e) => String(e.email || '').trim().toLowerCase() === needle) || null;
}

/* ── Financial-year helpers (Form 16 / payslip grouping) ────────── */

// 'YYYY-MM' → Indian FY label ('2025-26'): Apr–Mar.
export function fyOfMonth(month) {
  const y = parseInt(String(month).slice(0, 4), 10);
  const m = parseInt(String(month).slice(5, 7), 10);
  if (!y || !m) return '';
  const startYear = m >= 4 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// Annual totals for one FY from persisted payslip lines (fromPayrollLineDTO-shaped).
export function form16Summary(slips = [], fyLabel) {
  const inFy = slips.filter((s) => fyOfMonth(s.month) === fyLabel);
  const sum = (k) => inFy.map((s) => +s[k] || 0).reduce((a, b) => a + b, 0);
  return {
    months: inFy.length,
    gross: sum('gross'),
    pf: sum('empPF'),
    profTax: sum('profTax'),
    tds: sum('tds'),
    net: sum('net'),
  };
}
