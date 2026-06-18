/* ════════════════════════════════════════════════════════════════════
   CORE/DATES.JS
   Single source of truth for "now". Every date/period default across
   vouchers, reports, dashboards and finance derives from the real system
   clock here — so the app always reflects the current date, time, month
   and (Indian, Apr–Mar) financial year instead of hard-coded test dates.

   Quick map of what to use where:
     · Voucher opens      → todayISO() for the date field, nowLabel() to show
                            the current date & time.
     · Monthly reports    → CUR_MONTH default + MONTH_OPTIONS dropdown.
     · YTD reports        → CUR_FY / FY_YTD_MONTHS (FY start → current month).
     · "All data" reports → ALL_TIME_FROM (inception) → todayISO().
   ════════════════════════════════════════════════════════════════════ */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

/* ── plain date / time ─────────────────────────────────────────────── */
export function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function todayISO() { return isoDate(new Date()); }                       // "2026-06-04"
export function nowTime(d = new Date()) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; } // "14:30" (for <input type=time>)
export function nowDateTimeLocal(d = new Date()) { return `${isoDate(d)}T${nowTime(d)}`; }        // value for <input type=datetime-local>

/* "04 Jun 2026, 02:30 PM" — for displaying current date & time on a voucher */
export function nowLabel(d = new Date()) {
  let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}, ${pad(h)}:${pad(d.getMinutes())} ${ap}`;
}
/* "04-Jun-2026" — for displaying a stored ISO date */
export function fmtDate(iso) {
  if (!iso) return '—';
  // Read a YYYY-MM-DD (optionally with a time suffix) by its calendar components.
  // NOT via new Date('YYYY-MM-DD'): that parses as UTC midnight and then renders one
  // day EARLIER in any timezone behind UTC (e.g. FY start 2026-04-01 → "31-Mar-2026"
  // for a user in the Americas). Component parsing is timezone-independent.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m) return `${m[3]}-${MON[Number(m[2]) - 1]}-${m[1]}`;
  const d = new Date(iso); if (isNaN(d.getTime())) return String(iso);
  return `${pad(d.getDate())}-${MON[d.getMonth()]}-${d.getFullYear()}`;
}

/* ── month keys (YYYY-MM) ──────────────────────────────────────────── */
export function monthKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; } // "2026-06"
export const CUR_MONTH = monthKey();
export function monthLabel(key) {                                                // "Jun 2026"
  const [y, m] = String(key).split('-').map(Number);
  return `${MON[(m || 1) - 1]} ${y}`;
}
export function monthLabelLong(key) {                                            // "June 2026"
  const [y, m] = String(key).split('-').map(Number);
  return `${MON_FULL[(m || 1) - 1]} ${y}`;
}
export const CUR_MONTH_LABEL = monthLabel(CUR_MONTH);
/* previous calendar month for a "YYYY-MM" key (falls back to the month before
   the current one for non-month values like "YTD"/"ALL") — used by prior-period
   comparison columns. */
export function prevMonthKey(key) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(String(key));
  const base = m ? new Date(+m[1], +m[2] - 1, 1) : new Date();
  return monthKey(new Date(base.getFullYear(), base.getMonth() - 1, 1));
}

/* ── financial year (Apr 1 – Mar 31) ───────────────────────────────── */
export function fyOf(d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  const start = m >= 3 ? y : y - 1;                                              // FY starts in April (month index 3)
  return {
    startYear: start, endYear: start + 1,
    label: `${start}-${String(start + 1).slice(2)}`,                             // "2026-27"
    startISO: `${start}-04-01`, endISO: `${start + 1}-03-31`,
  };
}
export const CUR_FY = fyOf();
export const CUR_FY_LABEL = `FY ${CUR_FY.label}`;

/* month keys that make up a financial year, in order */
export function fyMonthKeys(startYear) {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const mo = 3 + i;                                                            // Apr..Mar
    const y = startYear + Math.floor(mo / 12);
    out.push(`${y}-${pad((mo % 12) + 1)}`);
  }
  return out;
}
export const FY_MONTHS = fyMonthKeys(CUR_FY.startYear);                          // all 12 keys of current FY
/* FY-to-date: from FY start up to & including the current month */
export const FY_YTD_MONTHS = FY_MONTHS.filter((m) => m <= CUR_MONTH);
export function fyMonthsUpTo(key) { return FY_MONTHS.filter((m) => m <= key); }

/* ── financial-year quarter (Apr-Jun=Q1 · Jul-Sep=Q2 · Oct-Dec=Q3 · Jan-Mar=Q4) ─ */
export function fyQuarterOf(d = new Date()) {
  const fy = fyOf(d);
  const fyOffset = (d.getMonth() - 3 + 12) % 12;                                 // 0=Apr … 11=Mar
  const q = Math.floor(fyOffset / 3);                                            // 0..3
  const startMonthIdx = 3 + q * 3;                                               // 3,6,9,12 (12 → Jan next yr; JS normalizes)
  const start = new Date(fy.startYear, startMonthIdx, 1);
  const end = new Date(fy.startYear, startMonthIdx + 3, 0);                      // last day of the quarter
  return {
    q: q + 1,                                                                    // 1..4
    label: `Q${q + 1} FY${fy.label}`,                                            // "Q1 FY2026-27"
    startISO: isoDate(start), endISO: isoDate(end),
  };
}
export const CUR_QUARTER = fyQuarterOf();                                        // today → e.g. Q1 FY2026-27 (Apr 1 → Jun 30)

/* ── current calendar month range (1st → last day) ─────────────────── */
export function monthRangeOf(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);                       // day 0 of next month = last day of this one
  return { startISO: isoDate(s), endISO: isoDate(e) };
}
export const CUR_MONTH_RANGE = monthRangeOf();

/* FY quarter a month key ("YYYY-MM") falls in — used to bucket monthly report
   rows into Q1–Q4. `sortKey` orders quarters across financial years. */
export function fyQuarterKey(key) {
  const [y, m] = String(key).split('-').map(Number);
  const fy = fyOf(new Date(y, (m || 1) - 1, 1));
  const off = (((m || 1) - 1) - 3 + 12) % 12;                                    // 0=Apr … 11=Mar
  const q = Math.floor(off / 3) + 1;                                             // 1..4
  return { q, fyLabel: fy.label, label: `Q${q} FY${fy.label}`, sortKey: fy.startYear * 10 + q };
}

/* ── dropdown option builders ──────────────────────────────────────── */
/* rolling list of recent months (newest first) so users can still reach
   months that already have data while the default stays "current month". */
export function monthOptions(count = 15, upToKey = CUR_MONTH) {
  const [yy, mm] = upToKey.split('-').map(Number);
  const base = yy * 12 + (mm - 1);
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = base - i, y = Math.floor(idx / 12), m = (idx % 12) + 1, k = `${y}-${pad(m)}`;
    out.push({ v: k, l: monthLabel(k) });
  }
  return out;
}
export const MONTH_OPTIONS = monthOptions();
/* month list + a YTD entry, for reports that offer a year-to-date roll-up */
export const PERIOD_OPTIONS = [...monthOptions(12), { v: 'YTD', l: `YTD ${CUR_FY.label}` }];

/* recent financial years (current first) */
export function fyOptions(count = 4) {
  const sy = CUR_FY.startYear;
  return Array.from({ length: count }, (_, i) => {
    const s = sy - i, label = `${s}-${String(s + 1).slice(2)}`;
    return { v: label, l: `FY ${label}` };
  });
}
export function fyRange(label) {
  const s = parseInt(String(label).slice(0, 4), 10);
  return { from: `${s}-04-01`, to: `${s + 1}-03-31` };
}

/* Preset report windows for period toggles (All · Monthly · Quarterly · YTD).
   Returns { from, to, label } so a report can both fetch and caption the window. */
export function presetRange(mode) {
  switch (mode) {
    case 'month': {
      const r = monthRangeOf();
      return { from: r.startISO, to: r.endISO, label: `${CUR_MONTH_LABEL} (current month)` };
    }
    case 'quarter': {
      const q = fyQuarterOf();
      return { from: q.startISO, to: q.endISO, label: q.label };
    }
    case 'ytd':
      return { from: CUR_FY.startISO, to: todayISO(), label: `YTD ${CUR_FY.label}` };
    case 'all':
    default:
      return { from: ALL_TIME_FROM, to: todayISO(), label: 'All time' };
  }
}

/* ── "show full data from inception" reports ───────────────────────── */
/* a sentinel far enough back to include the very first entry ever made */
export const ALL_TIME_FROM = '2000-01-01';

/* ── ready-made banner text for the top of every report ────────────── */
/* mode: 'month' | 'ytd' | 'fy' | 'all' | 'day' | 'range' */
export function rangeNote(mode, opts = {}) {
  switch (mode) {
    case 'month': return `Showing ${monthLabelLong(opts.month || CUR_MONTH)} (current month)`;
    case 'ytd':   return `Showing FY ${CUR_FY.label} year-to-date · ${fmtDate(CUR_FY.startISO)} → ${fmtDate(todayISO())}`;
    case 'fy':    return `Showing FY ${opts.fyLabel || CUR_FY.label} · ${fmtDate(opts.from || CUR_FY.startISO)} → ${fmtDate(opts.to || CUR_FY.endISO)}`;
    case 'day':   return `Showing ${fmtDate(opts.date || todayISO())}`;
    case 'all':   return `Showing all entries since inception → ${fmtDate(opts.to || todayISO())}`;
    case 'range': return `Showing ${fmtDate(opts.from)} → ${fmtDate(opts.to)}`;
    default:      return '';
  }
}
