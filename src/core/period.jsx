// ─── Uniform period selector (used by EVERY report / view screen) ─────────────
// Presets: All · Today · Week · MTD · QTD · LFY · CFY.
//  • All   → inception (earliest posted date) → today
//  • Today → today → today
//  • Week  → Monday of this week → today
//  • MTD   → 1st of this month → today
//  • QTD   → start of current (FY) quarter → today
//  • CFY/LFY → current / last financial year. FY basis is PER BRANCH:
//      India (BOM/AMD/TKHO/ALL) = Apr–Mar · Africa (NBO/DAR/FBM) = Jan–Dec.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';
import { branchCode } from './useAccounting';

const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Africa branches run a Jan–Dec financial year; everyone else Apr–Mar.
const AFRICA = new Set(['NBO', 'DAR', 'FBM']);
export function fyStartMonth(branch) {
  const c = (branch && (branch.code || branch)) || 'ALL';
  return AFRICA.has(c) ? 0 : 3; // 0 = Jan, 3 = Apr
}

export const PERIOD_PRESETS = [
  ['all', 'All'], ['today', 'Today'], ['week', 'Week'],
  ['mtd', 'MTD'], ['qtd', 'QTD'], ['lfy', 'LFY'], ['cfy', 'CFY'],
];

// preset → { from, to, label }
export function periodRange(preset, { branch, inception, now = new Date() } = {}) {
  const today = isoOf(now);
  const y = now.getFullYear(), m = now.getMonth();
  const sm = fyStartMonth(branch);
  const cfyStartYear = m >= sm ? y : y - 1;           // year the current FY began
  const cfyStart = new Date(cfyStartYear, sm, 1);
  const lfyStart = new Date(cfyStartYear - 1, sm, 1);
  const lfyEnd = new Date(cfyStartYear, sm, 0);        // day before CFY start
  const monthsIntoFy = ((m - sm) + 12) % 12;
  const qStart = new Date(cfyStartYear, sm + Math.floor(monthsIntoFy / 3) * 3, 1);
  const fyLabel = (sy) => (sm === 0 ? `${sy}` : `${sy}-${String(sy + 1).slice(-2)}`);
  switch (preset) {
    case 'all':   return { from: inception || '2000-01-01', to: today, label: 'All' };
    case 'today': return { from: today, to: today, label: 'Today' };
    case 'week': { const d = new Date(now); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return { from: isoOf(d), to: today, label: 'Week' }; }
    case 'mtd':   return { from: `${y}-${pad2(m + 1)}-01`, to: today, label: 'MTD' };
    case 'qtd':   return { from: isoOf(qStart), to: today, label: 'QTD' };
    case 'lfy':   return { from: isoOf(lfyStart), to: isoOf(lfyEnd), label: `LFY ${fyLabel(cfyStartYear - 1)}` };
    case 'cfy':
    default:      return { from: isoOf(cfyStart), to: today, label: `CFY ${fyLabel(cfyStartYear)}` };
  }
}

// Earliest posted date for the branch (for the "All" preset).
export function useInception(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'inception', code || 'all'],
    queryFn: () => apiGet('/api/accounting/inception', { branch: code }),
    staleTime: 5 * 60_000,
  });
}

const C = { dark: '#0d1326', gold: '#d4a437', dim: '#5a6691', border: '#d6dbe6' };

// Drop-in selector. Owns preset + custom dates; calls onChange({from,to,label,preset})
// whenever the effective range changes (incl. on mount). Date inputs stay editable.
export function PeriodBar({ branch, defaultPreset = 'cfy', onChange, compact = false }) {
  const [preset, setPreset] = useState(defaultPreset);
  const [custom, setCustom] = useState(null); // { from, to } when user edits dates
  const inc = useInception(branch).data?.from;
  const range = useMemo(
    () => (custom?.from && custom?.to
      ? { from: custom.from, to: custom.to, label: 'Custom', preset: 'custom' }
      : { ...periodRange(preset, { branch, inception: inc }), preset }),
    [preset, custom, branch, inc],
  );
  const last = useRef('');
  useEffect(() => {
    const k = `${range.from}|${range.to}`;
    if (k !== last.current) { last.current = k; if (onChange) onChange(range); }
  }, [range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const btn = (active) => ({
    padding: compact ? '4px 9px' : '5px 11px', fontSize: compact ? 11 : 12, fontWeight: 700,
    border: 'none', borderRadius: 6, cursor: 'pointer',
    background: active ? C.dark : 'transparent', color: active ? C.gold : C.dim,
  });
  const dInp = { padding: '4px 7px', fontSize: 11.5, border: `1px solid ${C.border}`, borderRadius: 6 };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', gap: 3, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, flexWrap: 'wrap' }}>
        {PERIOD_PRESETS.map(([k, l]) => (
          <button key={k} title={k === 'all' ? 'Inception → today' : ''} onClick={() => { setCustom(null); setPreset(k); }} style={btn(preset === k && !custom)}>{l}</button>
        ))}
      </div>
      <input type="date" value={range.from || ''} onChange={(e) => setCustom((c) => ({ from: e.target.value, to: c?.to || range.to }))} style={dInp} />
      <span style={{ color: C.dim }}>→</span>
      <input type="date" value={range.to || ''} onChange={(e) => setCustom((c) => ({ from: c?.from || range.from, to: e.target.value }))} style={dInp} />
    </div>
  );
}
