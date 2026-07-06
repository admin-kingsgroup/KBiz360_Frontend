import React, { useEffect, useState } from 'react';
import { getMyRole } from './api/myRole';

// ─── TK GROUP · FE · read-only "My Role" briefing ────────────────────────────
// Each person opens this to understand what applies to them: their role, who they
// report to, their duties, and which controls are currently live. Read-only — it
// mirrors the config; nobody can change anything here.

const listBlock = (label, items, color) => (items && items.length ? (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
    <ul style={{ margin: '3px 0 0', paddingLeft: 18 }}>{items.map((d, i) => <li key={i}>{d}</li>)}</ul>
  </div>
) : null);

// Split out the presentational view so it renders/tests without a fetch.
export function MyRoleView({ data }) {
  if (!data) return <div className="tk-myrole" style={{ padding: 14, color: '#777', fontSize: 12.5 }}>Loading your role…</div>;
  const p = data.profile || {};
  const controls = (data.activeControls && data.activeControls.length) ? data.activeControls.join(', ') : 'none yet (dormant)';
  return (
    <div className="tk-myrole" style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{data.name || data.role || 'You'}</div>
      <div style={{ color: '#555' }}>
        {p.title}{p.reportsTo ? ` · reports to ${p.reportsTo}` : ''}{typeof p.inTkGroup === 'boolean' ? ` · ${p.inTkGroup ? 'in TK Group Central' : 'branch-only'}` : ''}
      </div>
      {(p.mandate || p.act) ? <p style={{ color: '#333', margin: '8px 0', fontWeight: 600 }}>{p.mandate || p.act}</p> : null}
      {listBlock('Responsibilities', p.duties, '#5a6691')}
      {listBlock('You can approve', p.approves, '#1F6E4C')}
      {listBlock('You cannot', p.cannot, '#A32F2F')}
      <div style={{ marginTop: 10, color: '#777', fontSize: 11 }} data-testid="tk-active-controls">
        Controls active: {controls}
      </div>
    </div>
  );
}

export function MyRole() {
  const [data, setData] = useState(null);
  useEffect(() => { let live = true; getMyRole().then((d) => { if (live) setData(d); }); return () => { live = false; }; }, []);
  return <MyRoleView data={data} />;
}
