import React, { useEffect, useState } from 'react';
import { getMyRole } from '../api/myRole';
import { Card } from '../../../shell/primitives';

// ─── TK GROUP · FE · read-only "My Role" briefing ────────────────────────────
// Each person opens this to understand what applies to them: their role, who they
// report to, their duties, and which controls are currently live. Read-only — it
// mirrors the config; nobody can change anything here.
//
// Built from the shared design system (Card · PageSection · Badge + design tokens)
// so it matches the branch screens — no bespoke inline hex.

const listBlock = (label, items, toneClass, boxClass) => (items && items.length ? (
  <div className={`mt-2.5 rounded-brand border p-3 ${boxClass}`}>
    <div className={`text-[11px] font-bold uppercase tracking-wide ${toneClass}`}>{label}</div>
    <ul className="mt-1.5 list-disc space-y-0.5 pl-[18px]">{items.map((d) => <li key={d}>{d}</li>)}</ul>
  </div>
) : null);

// Split out the presentational view so it renders/tests without a fetch.
export function MyRoleView({ data }) {
  if (!data) return <div className="tk-myrole p-3.5 text-xs text-ink-muted">Loading your role…</div>;
  const p = data.profile || {};
  const controls = (data.activeControls && data.activeControls.length) ? data.activeControls.join(', ') : 'none yet (dormant)';
  return (
    <Card className="tk-myrole text-[12.5px] leading-relaxed">
      <div className="text-[15px] font-bold text-ink">{data.name || data.role || 'You'}</div>
      <div className="text-ink-muted">
        {p.title}{p.reportsTo ? ` · reports to ${p.reportsTo}` : ''}{typeof p.inTkGroup === 'boolean' ? ` · ${p.inTkGroup ? 'in TK Group Central' : 'branch-only'}` : ''}
      </div>
      {(p.mandate || p.act) ? <p className="my-2 font-semibold text-ink">{p.mandate || p.act}</p> : null}
      {listBlock('Responsibilities', p.duties, 'text-ink-muted', 'border-surface-border bg-surface-alt')}
      {listBlock('You can approve', p.approves, 'text-success', 'border-success/25 bg-success-soft')}
      {listBlock('You cannot', p.cannot, 'text-danger', 'border-danger/25 bg-danger-soft')}
      <div className="mt-3 rounded-brand border border-surface-border bg-surface-alt px-3 py-2 text-[11px] text-ink-muted" data-testid="tk-active-controls">
        Controls active: {controls}
      </div>
    </Card>
  );
}

export function MyRole() {
  const [data, setData] = useState(null);
  useEffect(() => { let live = true; getMyRole().then((d) => { if (live) setData(d); }); return () => { live = false; }; }, []);
  return <MyRoleView data={data} />;
}
