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

/* ── Leave balances (entitlement master + derived "taken") ──────────
   The master (/api/leave-balances) stores only ANNUAL ENTITLEMENT per bucket; how much
   is TAKEN is derived live from the approved leave requests so the two can never drift. */
export function fromLeaveBalanceDTO(b = {}) {
  return {
    id: b.id,
    empId: b.empId || '',
    empName: b.empName || '',
    branch: b.branch || '',
    year: b.year || '',
    annual: b.annual == null ? 18 : +b.annual,
    sick: b.sick == null ? 12 : +b.sick,
    casual: b.casual == null ? 6 : +b.casual,
  };
}
export function toLeaveBalancePayload(f = {}) {
  return {
    empId: f.empId || '',
    empName: f.empName || '',
    branch: f.branch || '',
    year: String(f.year || ''),
    annual: +f.annual || 0,
    sick: +f.sick || 0,
    casual: +f.casual || 0,
  };
}

// Which paid-leave bucket a request type deducts from. Handles both the storage enum
// (Casual/Sick/Earned) and the UI labels (Casual Leave/Sick Leave/Annual Leave). Unpaid
// / LWP deducts from no paid bucket → null. Pure.
export function leaveBucketOf(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('sick')) return 'sick';
  if (t.includes('casual')) return 'casual';
  if (t.includes('earned') || t.includes('annual')) return 'annual';
  return null; // unpaid / LWP / unknown → not a paid bucket
}

// Days TAKEN per bucket for one employee in a year, from APPROVED requests only
// (pending/rejected don't reduce the paid balance). `requests` are fromLeaveDTO-shaped
// ({ empId, type, from, days, status }). Pure — year comes from each request's `from`.
export function takenFor(requests = [], empId, year) {
  const out = { annual: 0, sick: 0, casual: 0 };
  for (const r of requests) {
    if (r.empId !== empId) continue;
    if (String(r.status) !== 'Approved') continue;
    if (String(r.from || '').slice(0, 4) !== String(year)) continue;
    const bucket = leaveBucketOf(r.type);
    if (bucket) out[bucket] += (+r.days || 0);
  }
  return out;
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

/* ── Shifts (working-time master) ───────────────────────────────── */
export function fromShiftDTO(s = {}) {
  return {
    id: s.id,
    name: s.name || '',
    code: s.code || '',
    branch: s.branch || '',
    startTime: s.startTime || '09:30',
    endTime: s.endTime || '18:30',
    breakMins: +s.breakMins || 0,
    graceMins: +s.graceMins || 0,
    weeklyOff: Array.isArray(s.weeklyOff) ? s.weeklyOff.map(Number) : [0],
    nightShift: !!s.nightShift,
    active: s.active !== false,
  };
}
export function toShiftPayload(f = {}) {
  return {
    name: f.name || '',
    code: f.code || '',
    branch: f.branch || '',
    startTime: f.startTime || '09:30',
    endTime: f.endTime || '18:30',
    breakMins: +f.breakMins || 0,
    graceMins: +f.graceMins || 0,
    weeklyOff: (Array.isArray(f.weeklyOff) ? f.weeklyOff : []).map(Number).filter((d) => d >= 0 && d <= 6),
    nightShift: !!f.nightShift,
    active: f.active !== false,
  };
}

// The set of weekly-off day-of-week ints for an employee's assigned shift, given the
// shifts list keyed by id. Falls back to Sunday-only when unassigned/unknown. Pure.
export function weeklyOffForShift(shiftId, shiftsById = {}) {
  const s = shiftId && shiftsById[shiftId];
  const wo = s && Array.isArray(s.weeklyOff) ? s.weeklyOff.map(Number) : [0];
  return wo;
}

// HH:mm → minutes since midnight, or null if malformed. Pure.
function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t == null ? '' : t).trim());
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return (h > 23 || mi > 59) ? null : h * 60 + mi;
}
// Pure: is an in-time late for the shift? Late = strictly after start + grace. Missing/
// malformed in-time or shift start → not late (can't judge). Mirrors the backend rule.
export function isLate(inTime, startTime, graceMins = 0) {
  const i = toMin(inTime), s = toMin(startTime);
  if (i == null || s == null) return false;
  return i > s + (Number(graceMins) || 0);
}

// Pure: one employee's month punctuality % = on-time ÷ present days that HAVE an in-time,
// judged against their shift (start + grace). Mirrors the backend punctualityPctOf EXACTLY
// (present-only, punch-required, grace-edge inclusive, same rounding, null when none) so the
// grid column and the dashboard KPI can't drift. `shift` is the resolved shift or undefined.
export function punctualityPct(days = {}, times = {}, shift) {
  let onTime = 0, timed = 0;
  for (const [d, code] of Object.entries(days || {})) {
    if (String(code || '').toUpperCase() !== 'P') continue;
    const inT = times && times[d] && times[d].in;
    if (!inT) continue;
    timed += 1;
    if (!isLate(inT, shift ? shift.startTime : null, shift ? shift.graceMins : 0)) onTime += 1;
  }
  return timed ? Math.round((onTime / timed) * 1000) / 10 : null;
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
