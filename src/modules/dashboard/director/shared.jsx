/* ════════════════════════════════════════════════════════════════════
   DIRECTOR DASHBOARDS — SHARED UI KIT
   Extracted from directorDashboards/directorDashboards.jsx (business
   sub-module reorg, 2026-07-13): the common palette, Toolbar/KPI/Card
   primitives and formatters used by every MENU_DASHBOARDS panel this file
   used to hold, plus finance/targetsMaster.jsx (the one export that turned
   out to be MENU_FINANCE-bound, not Dashboards).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PeriodBar, periodRange } from '../../../core/period';
import { CONSOLIDATED_LABEL, BRANCHES as LIVE_BRANCHES } from '../../../core/data';
import { openPrintPreview } from '../../../core/PrintPreview';

export const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#1f7a3d', amber: '#b8860b', dim: '#5a6691', border: '#cdd1d8', bg: '#f3f4f8' };

export const REGION = { '₹': 'India', '$': 'Africa' };
export const curSym = (b) => (b.cur ? b.cur : (b.currency === 'USD' || b.curCode === 'USD') ? '$' : '₹');
export const branchList = () => (LIVE_BRANCHES || []).filter((b) => b && b.code && b.code !== 'ALL').map((b) => ({ code: b.code, cur: curSym(b) }));

export const r0 = (n) => Math.round(Number(n) || 0);
export const money = (cur, n) => { const c = cur || '₹'; const loc = (c === '₹' || c === '₨' || c === 'Rs') ? 'en-IN' : 'en-US'; return (n < 0 ? '-' : '') + c + Math.abs(r0(n)).toLocaleString(loc); };
export const pct = (n) => (Number(n) || 0).toFixed(1) + '%';
export const pad2 = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fyStr = (now = new Date()) => { const y = now.getFullYear(); const s = now.getMonth() >= 3 ? y : y - 1; return `${s}-${String(s + 1).slice(-2)}`; };
export const MOD_OPTS = [['', 'All modules'], ['SF', 'Flight'], ['SH', 'Holiday'], ['SHT', 'Hotel'], ['SV', 'Visa'], ['SI', 'Insurance'], ['SC', 'Car'], ['SM', 'Misc']];

// ── shared UI bits ──────────────────────────────────────────────────────────────
// Header with title + the uniform PeriodBar (driven via the usePeriod object `p`).
export function Toolbar({ title, sub, branch, p, hidePeriod }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-3 border-b border-surface-border pb-3">
      <div>
        <div className="text-lg font-extrabold text-ink">{title}</div>
        {sub && <div className="text-xs text-ink-muted">{sub}</div>}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {!hidePeriod && <PeriodBar branch={branch} defaultPreset={p && p.def} onChange={p && p.setRange} />}
        <span className="rounded bg-info-soft px-2 py-1 text-[11px] font-bold text-info">{branch === 'ALL' || !branch ? CONSOLIDATED_LABEL : (branch.code || branch)}</span>
        <button onClick={() => openPrintPreview({ selector: 'main', title, recommend: 'portrait' })} title="Export / print this dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 11.5, fontWeight: 700, color: C.dark, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>⎙ Export</button>
      </div>
    </div>
  );
}

export function KPI({ label, value, sub, tone, delta, onClick, icon: Icon }) {
  const col = tone === 'bad' ? C.red : tone === 'good' ? C.green : C.dark;
  const clickable = typeof onClick === 'function';
  return (
    <div onClick={onClick} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      title={clickable ? 'Open details →' : undefined}
      className="min-w-[180px] flex-1 basis-[180px] rounded-brand bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ cursor: clickable ? 'pointer' : 'default', border: `1px solid ${C.border}`, borderLeft: `4px solid ${col}` }}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {Icon && <Icon size={13} style={{ color: col, flexShrink: 0 }} />}
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-black tabular-nums" style={{ color: col }}>{value}</div>
      <div className="mt-0.5 flex items-center justify-between">
        {sub && <span className="text-[11px] text-ink-muted">{sub}{clickable && <ArrowRight size={11} className="ml-1 inline align-middle" />}</span>}
        {delta != null && <span className="text-[11px] font-bold" style={{ color: delta >= 0 ? C.green : C.red }}>{delta >= 0 ? '▲' : '▼'} {pct(Math.abs(delta))}</span>}
      </div>
    </div>
  );
}
export const Card = ({ title, children, right }) => (
  <div className="mt-3.5 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-card">
    <div className="flex items-center justify-between border-b border-surface-border bg-surface-alt px-3.5 py-2.5">
      <strong className="text-[13.5px] text-ink">{title}</strong>{right}
    </div>
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">{children}</div>
  </div>
);
export const th = { padding: '8px 12px', background: C.bg, color: C.dim, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' };
export const td = { padding: '7px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
export const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

// usePeriod — holds the active range; the PeriodBar inside Toolbar drives setRange.
export function usePeriod(def = 'all') {
  const [range, setRange] = useState(() => periodRange(def, {}));
  return { range, setRange, def };
}
