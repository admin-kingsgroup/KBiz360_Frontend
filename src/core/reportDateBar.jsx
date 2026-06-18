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
import { Search, X } from 'lucide-react';
import { isoDate, todayISO } from './dates';
import { inp } from './styleTokens';
import { periodRange } from './period';

// FY (Apr–Mar) start year for a given date: Jan–Mar belongs to the prior FY.
const fyStartYearOf = (d = new Date()) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);

/** Resolve a quick-filter preset to a concrete { from, to } ISO window.
 *  Uniform presets (today/week/mtd/qtd/cfy/lfy) delegate to the shared periodRange
 *  (per-branch FY). 'all' → blank window (backend loads full history = inception→today).
 *  Legacy modes (month/quarter/ytd) kept so any saved state still resolves. */
export function resolveReportRange(mode, branch) {
  const now = new Date();
  if (mode === 'all') return { from: '', to: '' };                       // no constraints
  if (['today', 'week', 'mtd', 'qtd', 'cfy', 'lfy'].includes(mode)) {
    const r = periodRange(mode, { branch });
    return { from: r.from, to: r.to };
  }
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

/** Free-text search box shared by report pages. Controlled — the parent owns the
 *  string and uses it to filter the rendered rows (so a search shows matches only).
 *  `matchRow(haystackParts, needle)` is the companion helper for the filtering side. */
export function ReportSearch({ value, onChange, placeholder = 'Search…', width = 230 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Search size={13} style={{ position: 'absolute', left: 9, color: '#94a3b8', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inp, width, minHeight: 32, fontSize: 11, paddingLeft: 28, paddingRight: value ? 26 : 10 }}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} title="Clear search"
          style={{ position: 'absolute', right: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}>
          <X size={13} />
        </button>
      )}
    </span>
  );
}

/** Build a lower-cased haystack from a row's fields and test it against a (already
 *  lower-cased, trimmed) needle. Empty needle → always matches. */
export function matchNeedle(parts, needle) {
  if (!needle) return true;
  return parts.filter((x) => x != null && x !== '').join('  ').toLowerCase().includes(needle);
}

export function ReportDateBar({ value, onChange, branch }) {
  const { mode = 'cfy', from = '', to = '' } = value || {};
  const pick = (m) => { const r = resolveReportRange(m, branch); onChange({ mode: m, from: r.from, to: r.to }); };
  // Manual edits switch to Custom and clear the active preset highlight.
  const editFrom = (v) => onChange({ mode: 'custom', from: v, to });
  const editTo = (v) => onChange({ mode: 'custom', from, to: v });
  const PRESETS = [['all', 'All'], ['today', 'Today'], ['week', 'Week'], ['mtd', 'MTD'], ['qtd', 'QTD'], ['lfy', 'LFY'], ['cfy', 'CFY']];
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
