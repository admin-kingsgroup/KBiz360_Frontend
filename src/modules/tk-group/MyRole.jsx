import React, { useEffect, useState } from 'react';
import { getMyRole } from './api/myRole';

// ─── TK GROUP · FE · read-only "My Role" briefing ────────────────────────────
// Each person opens this to understand what applies to them: their role, who they
// report to, their duties, and which controls are currently live. Read-only — it
// mirrors the config; nobody can change anything here.

// Split out the presentational view so it renders/tests without a fetch.
export function MyRoleView({ data }) {
  if (!data) return <div className="tk-myrole" style={{ padding: 14, color: '#777', fontSize: 12.5 }}>Loading your role…</div>;
  const p = data.profile || {};
  const controls = (data.activeControls && data.activeControls.length) ? data.activeControls.join(', ') : 'none yet (dormant)';
  return (
    <div className="tk-myrole" style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{data.name || data.role || 'You'}</div>
      <div style={{ color: '#555' }}>
        {p.title}{p.reportsTo ? ` · reports to ${p.reportsTo}` : ''}
      </div>
      {p.act ? <p style={{ color: '#555', margin: '8px 0' }}>{p.act}</p> : null}
      {p.duties && p.duties.length ? (
        <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
          {p.duties.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      ) : null}
      <div style={{ marginTop: 8, color: '#777', fontSize: 11 }} data-testid="tk-active-controls">
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
