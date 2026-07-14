/* ════════════════════════════════════════════════════════════════════
   ACCOUNTANTWORKSPACE — SHARED UI KIT
   Extracted from accountantWorkspace.jsx (business sub-module reorg,
   2026-07-13): the common palette, page shell, table chrome and tile/section
   primitives used by every screen this file used to hold — regardless of
   which business module they moved to (accounts/, reconciliation/,
   tally-reconciliation/) — so none of them needs a duplicate copy.
   ════════════════════════════════════════════════════════════════════ */

import { ArrowRight } from 'lucide-react';
import { CONSOLIDATED_LABEL } from '../../core/data';
import { clickable } from '../../core/ux/clickable';
import { Pager } from '../../core/ux/pager';
import { PageLayout } from '../../shell/PageLayout';

export const C = { dark: '#1a1c22', gold: '#c2a04a', blue: '#2563eb', red: '#dc2626', green: '#16a34a', dim: '#5b616e', border: '#cdd1d8', amber: '#d97706' };
// Design-system card values (brand radius + soft elevation + subtle border), so every
// `{...card}` surface in this workspace adopts the premium look without structural change.
export const card = { background: '#fff', border: '1px solid #cdd1d8', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,18,22,0.04), 0 6px 20px -10px rgba(16,18,22,0.12)' };
export const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');

export const brLabel = (b) => (b === 'ALL' || !b ? CONSOLIDATED_LABEL : (b.name || b.code || b));
export const thisYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

// ── shared UI bits ───────────────────────────────────────────────────────────
export const Shell = ({ title, sub, right, children }) => (
  <PageLayout title={title} subtitle={sub} actions={right}>
    {children}
  </PageLayout>
);
export const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
export const td = { padding: '8px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
export const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
// `pager` (from usePager) renders the infinite-scroll sentinel INSIDE this scroll
// box, right after the table — so it only triggers a load when you scroll to the
// bottom of the box (not the moment the table mounts).
export const Table = ({ children, pager }) => (
  <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
      {pager && <Pager pager={pager} />}
    </div>
  </div>
);
export const aBtn = (bg) => ({ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', background: bg, display: 'inline-flex', alignItems: 'center', gap: 5 });

// Module-level so they don't remount each render.
export const Tile = ({ icon, label, value, sub, tone = C.dark, onClick, loading }) => (
  <div {...(onClick ? clickable(onClick) : {})} style={{ ...card, padding: 14, cursor: onClick ? 'pointer' : 'default', minWidth: 180, flex: '1 1 180px', borderLeft: `4px solid ${tone}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.dim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{icon}{label}</div>
    {loading
      ? <div className="kb-skeleton" style={{ height: 22, width: '68%', marginTop: 8, borderRadius: 6 }} />
      : <div style={{ fontSize: 21, fontWeight: 800, color: tone, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>}
    {sub && (loading
      ? <div className="kb-skeleton" style={{ height: 10, width: '42%', marginTop: 7, borderRadius: 5 }} />
      : <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{sub} {onClick && <ArrowRight size={11} style={{ verticalAlign: 'middle' }} />}</div>)}
  </div>
);
export const SecTitle = ({ children }) => <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 2px 8px' }}>{children}</div>;
export const Row = ({ children }) => <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>{children}</div>;
