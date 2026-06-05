/* ════════════════════════════════════════════════════════════════════
   CORE/REPORT-DATE-BAR.JSX

   The unified date-control bar shared by every report. Four quick presets
   (Monthly · Quarterly · YTD · All) plus an open From/To calendar with
   unrestricted back-dating. Picking a preset auto-fills From/To; editing a
   date manually drops the bar into "Custom" and clears the active preset.

   State shape (owned by the parent so it can be appended to API calls):
       { mode: 'month'|'quarter'|'ytd'|'all'|'custom', from: ISO|'' , to: ISO|'' }

   Helpers:
       resolveReportRange(mode) → { from, to } for a preset
       priorYearRange(range)    → the same window shifted exactly 12 months back
       toQueryParams(range)     → { startDate, endDate } (omits blanks → "All")

   Business quarter = Indian financial-year quarter (Apr–Jun = Q1 … Jan–Mar = Q4).
   ════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { isoDate, todayISO } from './dates';
import { inp } from './styles';

// FY (Apr–Mar) start year for a given date: Jan–Mar belongs to the prior FY.
const fyStartYearOf = (d = new Date()) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);

/** Resolve a quick-filter preset to a concrete { from, to } ISO window. */
export function resolveReportRange(mode) {
  const now = new Date();
  if (mode === 'all') return { from: '', to: '' };                       // no constraints
  if (mode === 'month') {                                                // current calendar month
    return {
      from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (mode === 'quarter') {                                              // active FY business quarter
    const fyStart = fyStartYearOf(now);
    const qi = Math.floor(((now.getMonth() - 3 + 12) % 12) / 3);         // 0..3 within the FY
    const startMonthAbs = 3 + qi * 3;                                    // 3,6,9,12 from the FY baseline
    const sy = fyStart + Math.floor(startMonthAbs / 12);
    const sm = startMonthAbs % 12;
    return { from: isoDate(new Date(sy, sm, 1)), to: isoDate(new Date(sy, sm + 3, 0)) };
  }
  return { from: `${fyStartYearOf(now)}-04-01`, to: todayISO() };        // YTD: FY start → today
}

/** The comparison window exactly 12 months before the selected range. */
export function priorYearRange({ from, to } = {}) {
  if (!from || !to) return { from: '', to: '' };
  const shift = (iso) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setFullYear(d.getFullYear() - 1); return isoDate(d); };
  return { from: shift(from), to: shift(to) };
}

/** API query params — blanks dropped so "All" sends nothing and the backend
 *  loads the full history. Use with apiGet(path, toQueryParams(range)). */
export function toQueryParams({ from, to } = {}) {
  const p = {};
  if (from) p.startDate = from;
  if (to) p.endDate = to;
  return p;
}

export function ReportDateBar({ value, onChange }) {
  const { mode = 'month', from = '', to = '' } = value || {};
  const pick = (m) => { const r = resolveReportRange(m); onChange({ mode: m, from: r.from, to: r.to }); };
  // Manual edits switch to Custom and clear the active preset highlight.
  const editFrom = (v) => onChange({ mode: 'custom', from: v, to });
  const editTo = (v) => onChange({ mode: 'custom', from, to: v });
  const PRESETS = [['month', 'Monthly'], ['quarter', 'Quarterly'], ['ytd', 'YTD'], ['all', 'All']];
  const btn = (active) => ({ padding: '7px 13px', fontSize: 11.5, fontWeight: 700, border: `1px solid ${active ? '#0d1326' : '#e1e3ec'}`, background: active ? '#0d1326' : '#fff', color: active ? '#d4a437' : '#5a6691', borderRadius: 7, cursor: 'pointer' });
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', gap: 6 }}>
        {PRESETS.map(([id, label]) => <button key={id} onClick={() => pick(id)} style={btn(mode === id)}>{label}</button>)}
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#5a6691' }}>
        From <input type="date" value={from} onChange={(e) => editFrom(e.target.value)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11 }} />
        To <input type="date" value={to} onChange={(e) => editTo(e.target.value)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11 }} />
        {mode === 'custom' && <span style={{ fontSize: 10, fontWeight: 800, color: '#185FA5' }}>CUSTOM</span>}
        {mode === 'all' && <span style={{ fontSize: 10, fontWeight: 800, color: '#185FA5' }}>ALL TIME</span>}
      </span>
    </div>
  );
}
