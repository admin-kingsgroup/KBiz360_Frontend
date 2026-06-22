/* Pure mappers between the HR feature DTOs (/api/leave-requests, /api/job-openings)
   and the field names + label casing the HR screens render. Backend status enums
   are lowercase; the UI shows Title-Case chips. Kept separate so the wiring
   contract is unit-testable without importing the heavy HR/helpers bundles. */

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ── Leave requests ─────────────────────────────────────────────── */
// status enum: pending | approved | rejected | cancelled
export function fromLeaveDTO(r = {}) {
  return {
    id: r.id,
    empId: r.empId || '',
    empName: r.employee || '',
    branch: r.branch || '',
    type: r.type || 'Casual Leave',
    from: r.from || '',
    to: r.to || '',
    days: +r.days || 0,
    reason: r.reason || '',
    status: cap(r.status || 'pending'),
  };
}
export function toLeavePayload(f = {}) {
  return {
    empId: f.empId || '',
    employee: f.empName || '',
    branch: f.branch || '',
    type: f.type || 'Casual Leave',
    from: f.from || '',
    to: f.to || '',
    days: +f.days || 0,
    reason: f.reason || '',
    status: String(f.status || 'Pending').toLowerCase(),
  };
}

// Inclusive whole-day span between two YYYY-MM-DD dates (min 1). Pure — no Date.now.
export function leaveDays(from, to) {
  if (!from || !to) return 1;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const d = Math.round((b - a) / 86400000) + 1;
  return d > 0 ? d : 1;
}

/* ── Job openings (recruitment) ─────────────────────────────────── */
// status enum: open | interviewing | hired | on-hold | closed
const JOB_STATUS_LABEL = { open: 'Open', interviewing: 'Interviewing', hired: 'Hired', 'on-hold': 'On-hold', closed: 'Closed' };
const JOB_STATUS_CODE = { Open: 'open', Interviewing: 'interviewing', Hired: 'hired', 'On-hold': 'on-hold', Closed: 'closed' };
// The card's "advance" button walks a vacancy forward through its lifecycle.
export const JOB_NEXT_STATUS = { Open: 'Interviewing', Interviewing: 'Hired', Hired: 'Closed', 'On-hold': 'Closed', Closed: 'Closed' };

export function fromJobDTO(j = {}) {
  return {
    id: j.id,
    title: j.title || '',
    dept: j.department || '',
    branch: j.branch || '',
    location: j.location || '',
    type: j.jobType || 'Full-time',
    salary: j.salaryRange || '',
    applicants: +j.applicants || 0,
    skills: j.skills || '',
    posted: j.openedAt || '',
    status: JOB_STATUS_LABEL[j.status] || 'Open',
  };
}
export function toJobPayload(f = {}) {
  return {
    title: f.title || '',
    department: f.dept || '',
    branch: f.branch || '',
    location: f.location || '',
    jobType: f.type || 'Full-time',
    salaryRange: f.salary || '',
    applicants: +f.applicants || 0,
    skills: f.skills || '',
    openedAt: f.posted || '',
    status: JOB_STATUS_CODE[f.status] || 'open',
  };
}

/* ── Employee loans / salary advances ───────────────────────────── */
export function fromLoanDTO(l = {}) {
  const principal = +l.principal || 0, emi = +l.emi || 0, paid = +l.paid || 0;
  return {
    id: l.id, name: l.name || '', empCode: l.empCode || '', designation: l.designation || '',
    branch: l.branch || '', type: l.type || 'Salary Advance',
    principal, emi, emiCount: +l.emiCount || 0, paid, disbursedDate: l.disbursedDate || '',
    outstanding: Math.max(0, principal - paid * emi),   // derived, never stored
  };
}
export function toLoanPayload(f = {}) {
  return {
    name: f.name || '', empCode: f.empCode || '', designation: f.designation || '',
    branch: f.branch || '', type: f.type || 'Salary Advance',
    principal: +f.principal || 0, emi: +f.emi || 0, emiCount: +f.emiCount || 0,
    paid: +f.paid || 0, disbursedDate: f.disbursedDate || '',
  };
}

/* ── Salary revision events ─────────────────────────────────────── */
export function fromRevisionDTO(r = {}) {
  return {
    id: r.id, empId: r.empId || '', empName: r.empName || '', branch: r.branch || '',
    date: r.date || '', basic: +r.basic || 0, increment: +r.increment || 0,
    pct: +r.pct || 0, reason: r.reason || '',
  };
}
export function toRevisionPayload(f = {}) {
  return {
    empId: f.empId || '', empName: f.empName || '', branch: f.branch || '',
    date: f.date || '', basic: +f.basic || 0, increment: +f.increment || 0,
    pct: +f.pct || 0, reason: f.reason || '',
  };
}
