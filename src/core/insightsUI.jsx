// Shared "analytical density" UI primitives — proportion bars, % cells, insights
// rail cards, performance tints and a compact KPI ribbon. Promoted out of the
// reportsFinancial statement views so every module (tax registers, payroll,
// transaction registers, …) can fill the space freed by the 1600 width
// standard with information instead of whitespace.
import React from 'react';

// Self-contained palette (mirrors the SAP tokens used across the finance screens)
// so this module has no cross-imports and can't drift.
const C = {
  border: '#cdd1d8', borderLt: '#dfe2e7', sec: '#6a6d70', ink: '#0a2955',
  text: '#32363a', green: '#15803d', red: '#bb0000', orange: '#e9730c', blue: '#2563eb',
};
const SHADOW = '0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)';

// A value's share of a base, as a non-negative percentage (sign-agnostic).
export const share = (amount, base) => {
  const b = Math.abs(Number(base) || 0);
  return b ? (Math.abs(Number(amount) || 0) / b) * 100 : 0;
};
export const pctText = (p, dp = 1) => `${(Number(p) || 0).toFixed(dp)}%`;

// Performance tint for a margin/GP% cell or row background.
export const gpTint = (v) => (v >= 13 ? '#e7f6ec' : v >= 8 ? '#fef6e0' : v >= 0 ? '#fdeee0' : '#fdecea');

// Proportion bar. tone: 'sales'(blue, default) | 'cogs'(orange) | 'pos'(green) |
// 'neg'(red); `color` (a CSS background) overrides tone for signed/custom bars.
export function MiniBar({ pct, tone, color }) {
  const w = Math.max(0, Math.min(100, Math.abs(Number(pct) || 0)));
  const fill = color || (
    tone === 'cogs' ? 'linear-gradient(90deg,#f0a35e,#d97706)'
      : tone === 'neg' ? 'linear-gradient(90deg,#f87171,#bb0000)'
        : tone === 'pos' ? 'linear-gradient(90deg,#22c55e,#15803d)'
          : 'linear-gradient(90deg,#3b82f6,#1d4ed8)');
  return <div style={{ height: 8, borderRadius: 5, background: '#eef1f5', overflow: 'hidden' }}><div style={{ height: '100%', width: `${w}%`, borderRadius: 5, background: fill }} /></div>;
}

// A "% + bar" table-cell body — pass the share %, wrap the result in a <td>.
export function PctBar({ pct, tone, color, w = 42 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: C.sec, width: w, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{pctText(pct)}</span>
      <div style={{ flex: 1, minWidth: 36 }}><MiniBar pct={pct} tone={tone} color={color} /></div>
    </div>
  );
}

// Insights-rail card + stat row (used beside the wide statement/register views).
export function RailCard({ title, children }) {
  return (
    <div className="noprint" style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: SHADOW }}>
      <div style={{ padding: '9px 14px', fontSize: 12, fontWeight: 800, background: '#f6f8fb', color: C.ink, borderBottom: `1px solid ${C.borderLt}` }}>{title}</div>
      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}
export function Stat({ label, value, tone, last }) {
  const c = tone === 'pos' ? C.green : tone === 'neg' ? C.red : tone === 'warn' ? C.orange : C.text;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: last ? 'none' : '1px dashed #e6e9ee', fontSize: 12.5 }}>
      <span style={{ color: C.sec }}>{label}</span><b style={{ fontSize: 13.5, color: c }}>{value}</b>
    </div>
  );
}

// Compact KPI ribbon for modules that don't have the finance Kpi/KpiGrid in scope.
export function KpiRibbon({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,160px),1fr))', gap: 10, marginBottom: 12 }}>{children}</div>;
}
export function MiniKpi({ label, value, sub, tone }) {
  const bar = { blue: C.blue, green: C.green, orange: C.orange, red: C.red }[tone] || C.blue;
  const vc = { green: C.green, red: C.red, orange: C.orange }[tone] || C.text;
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderTop: `3px solid ${bar}`, borderRadius: 8, padding: '10px 13px', boxShadow: SHADOW }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8696a9', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: vc, margin: '3px 0 1px' }}>{value}</div>
      {sub != null && <div style={{ fontSize: 10.5, color: '#8696a9' }}>{sub}</div>}
    </div>
  );
}
