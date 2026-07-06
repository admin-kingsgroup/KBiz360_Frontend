import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRoles } from './api/myRole';

// ─── TK GROUP · FE · Roles & Responsibilities (org-wide, shareable) ──────────
// Every role's responsibilities in one place — read live from the backend profiles,
// so if a rule changes there it AUTO-UPDATES here for everyone. The viewer's own
// role is highlighted. Reachable by every user (from the user menu), not just Central.
const card = (mine) => ({
  border: `1px solid ${mine ? '#bcd8c8' : '#e3e6ec'}`, borderRadius: 10, padding: '14px 16px',
  background: mine ? '#F3FAF6' : '#fff', boxShadow: '0 1px 2px rgba(16,18,22,0.04)',
});
const listBlock = (label, items, color) => (items && items.length ? (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 10.5, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
    <ul style={{ margin: '3px 0 0', paddingLeft: 18, fontSize: 12 }}>{items.map((d, i) => <li key={i}>{d}</li>)}</ul>
  </div>
) : null);

export function RolesResponsibilities() {
  const q = useQuery({ queryKey: ['tk', 'roles', 'all'], queryFn: getAllRoles, staleTime: 5 * 60_000 });
  const youAre = (q.data && q.data.youAre) || '';
  const roles = (q.data && q.data.roles) || [];

  return (
    <div style={{ display: 'grid', gap: 12 }} data-testid="tk-roles">
      <p style={{ fontSize: 12, color: '#5a6691', margin: 0 }}>
        Everyone's role and responsibilities in the ERP. Read-only and always current — it updates automatically when the model changes.
      </p>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {roles.length ? roles.map((r) => {
          const mine = r.key === youAre;
          return (
            <section key={r.key} style={card(mine)}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1f2a44', margin: 0 }}>{r.title}</h2>
                {mine ? <span style={{ fontSize: 10, fontWeight: 700, color: '#1F6E4C', background: '#E6F2EC', borderRadius: 20, padding: '1px 8px' }}>THIS IS YOU</span> : null}
              </div>
              <div style={{ fontSize: 11.5, color: '#8892a4', marginTop: 1 }}>
                {r.person}{r.reportsTo ? ` · reports to ${r.reportsTo}` : ' · top of hierarchy'}{typeof r.inTkGroup === 'boolean' ? ` · ${r.inTkGroup ? 'TK Group Central' : 'branch-only'}` : ''}
              </div>
              {r.mandate ? <p style={{ fontSize: 12.5, color: '#333', fontWeight: 600, margin: '8px 0 0' }}>{r.mandate}</p> : null}
              {listBlock('Responsibilities', r.duties, '#5a6691')}
              {listBlock('Can approve', r.approves, '#1F6E4C')}
              {listBlock('Cannot', r.cannot, '#A32F2F')}
            </section>
          );
        }) : <div style={{ color: '#777', fontSize: 12.5 }}>Loading roles…</div>}
      </div>
    </div>
  );
}
