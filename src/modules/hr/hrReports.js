/* Pure derivations for the two HR analytics reports — computed entirely from the
   live employee master + live leave register, so the screens show real figures
   instead of hardcoded sample arrays. Kept pure (no Date.now, no network) so they
   are unit-testable; the component passes in the data and the month window.

   Employee rows are the UI shape from employeeMap.fromEmpDTO:
     { id, name, branch, joined, exit, status, ... }
   Leave rows are the UI shape from hrMaps.fromLeaveDTO:
     { empId, empName, branch, type, days, status, ... } */

const DEFAULT_ENTITLED = 30; // annual leave entitlement (AL+SL+CL policy default)

const typeIs = (t, kw) => new RegExp(kw, 'i').test(String(t || ''));

/* Leave Utilization: one row per employee with approved leave days split by type
   and a utilisation % against entitlement. */
export function buildLeaveUtilization(employees = [], leaves = [], entitled = DEFAULT_ENTITLED) {
  const approved = leaves.filter((l) => l.status === 'Approved');
  return employees.map((e) => {
    const mine = approved.filter((l) => l.empId === e.id);
    const sum = (kw) => mine.filter((l) => typeIs(l.type, kw)).reduce((s, l) => s + (+l.days || 0), 0);
    const casual = sum('casual');
    const sick = sum('sick');
    // "Earned"/"Annual" both count as earned leave
    const earned = mine.filter((l) => typeIs(l.type, 'earned') || typeIs(l.type, 'annual')).reduce((s, l) => s + (+l.days || 0), 0);
    const used = mine.reduce((s, l) => s + (+l.days || 0), 0);
    return {
      empId: e.id, name: e.name, branch: e.branch,
      entitled, used, balance: entitled - used,
      casual, sick, earned,
      utilPct: entitled > 0 ? (used / entitled) * 100 : 0,
    };
  });
}

const ym = (d) => String(d || '').slice(0, 7);           // 'YYYY-MM-DD' → 'YYYY-MM'
const monthEnd = (m) => `${m}-31`;                        // string-comparable upper bound for the month

/* Attrition: a joiners/leavers/headcount series over the supplied months
   (each 'YYYY-MM', chronological). Headcount at a month's end = joined on/before
   the month end and not yet exited. Pure — month list comes from the caller. */
export function buildAttrition(employees = [], months = []) {
  const rows = months.map((m) => {
    const end = monthEnd(m);
    const joiners = employees.filter((e) => ym(e.joined) === m).length;
    const leavers = employees.filter((e) => e.exit && ym(e.exit) === m).length;
    const closingHc = employees.filter((e) => e.joined && e.joined <= end && (!e.exit || e.exit > end)).length;
    const openingHc = closingHc - joiners + leavers;
    return { month: m, openingHc, joiners, leavers, closingHc, attritionRate: openingHc > 0 ? (leavers / openingHc) * 100 : 0 };
  });
  const ttlJoiners = rows.reduce((s, r) => s + r.joiners, 0);
  const ttlLeavers = rows.reduce((s, r) => s + r.leavers, 0);
  const avgHc = rows.length ? rows.reduce((s, r) => s + r.closingHc, 0) / rows.length : 0;
  const annualAttrition = avgHc > 0 ? (ttlLeavers / avgHc) * 100 : 0;
  return { rows, ttlJoiners, ttlLeavers, avgHc, annualAttrition };
}

// Add `n` whole months to a YYYY-MM-DD date, returning YYYY-MM-DD. Pure.
function addMonths(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m) return '';
  const dt = new Date(y, m - 1 + n, d || 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

/* Salary-revision "due" schedule: for each employee, the latest revision sets the
   current basic + last-revised date (falling back to the employee's join date and
   master basic when never revised). Next due = last + `intervalMonths`; OVERDUE
   once it passes `asOfISO`. Pure — caller passes today's date. */
export function buildRevisionDue(employees = [], revisions = [], asOfISO, intervalMonths = 12) {
  return employees.map((e) => {
    const mine = revisions.filter((r) => r.empId === e.id).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const latest = mine[mine.length - 1] || null;
    const currentBasic = latest ? latest.basic : (+e.basic || 0);
    const lastRevision = latest ? latest.date : (e.joined || '');
    const nextDue = lastRevision ? addMonths(lastRevision, intervalMonths) : '';
    const daysPast = nextDue ? daysBetween(nextDue, asOfISO) : 0; // >0 ⇒ overdue
    return {
      empId: e.id, empName: e.name, branch: e.branch,
      currentBasic, lastRevision, nextDue,
      daysPast, status: daysPast > 0 ? 'OVERDUE' : 'OK',
    };
  });
}

/* The last `n` months ending at `asOfYM` ('YYYY-MM'), chronological. Caller passes
   the current month so this stays pure/testable. */
export function lastMonths(asOfYM, n = 12) {
  const [y, m] = String(asOfYM).split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
