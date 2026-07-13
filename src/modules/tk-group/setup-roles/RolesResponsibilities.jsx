import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRoles } from '../api/myRole';
import { Card, Badge, ResponsiveGrid } from '../../../shell/primitives';

// ─── TK GROUP · FE · Roles & Responsibilities (org-wide, shareable) ──────────
// Every role's responsibilities in one place — read live from the backend profiles,
// so if a rule changes there it AUTO-UPDATES here for everyone. The viewer's own
// role is highlighted. Reachable by every user (from the user menu), not just Central.
//
// Built from the shared design system (Card · Badge · ResponsiveGrid + design tokens)
// so it matches the branch screens — no bespoke inline hex.

const listBlock = (label, items, toneClass, boxClass) => (items && items.length ? (
  <div className={`mt-2 rounded-brand border p-2.5 ${boxClass}`}>
    <div className={`text-[10.5px] font-bold uppercase tracking-wide ${toneClass}`}>{label}</div>
    <ul className="mt-1 list-disc space-y-0.5 pl-[18px] text-xs">{items.map((d) => <li key={d}>{d}</li>)}</ul>
  </div>
) : null);

export function RolesResponsibilities() {
  const q = useQuery({ queryKey: ['tk', 'roles', 'all'], queryFn: getAllRoles, staleTime: 5 * 60_000 });
  const youAre = (q.data && q.data.youAre) || '';
  const roles = (q.data && q.data.roles) || [];

  return (
    <div className="grid gap-3">
      <p className="m-0 text-xs text-ink-muted">
        Everyone's role and responsibilities in the ERP. Read-only and always current — it updates automatically when the model changes.
      </p>
      <ResponsiveGrid min="260px" gap="md" data-testid="tk-roles">
        {roles.length ? roles.map((r) => {
          const mine = r.key === youAre;
          return (
            <Card key={r.key} className={mine ? 'border-success/40 bg-success-soft' : ''}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="m-0 text-sm font-extrabold text-navy">{r.title}</h2>
                {mine ? <Badge tone="success" size="sm">THIS IS YOU</Badge> : null}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink-muted">
                {r.person}{r.reportsTo ? ` · reports to ${r.reportsTo}` : ' · top of hierarchy'}{typeof r.inTkGroup === 'boolean' ? ` · ${r.inTkGroup ? 'TK Group Central' : 'branch-only'}` : ''}
              </div>
              {r.mandate ? <p className="mt-2 text-[12.5px] font-semibold text-ink">{r.mandate}</p> : null}
              {listBlock('Responsibilities', r.duties, 'text-ink-muted', 'border-surface-border bg-surface-alt')}
              {listBlock('Can approve', r.approves, 'text-success', 'border-success/25 bg-success-soft')}
              {listBlock('Cannot', r.cannot, 'text-danger', 'border-danger/25 bg-danger-soft')}
            </Card>
          );
        }) : <div className="text-xs text-ink-muted">Loading roles…</div>}
      </ResponsiveGrid>
    </div>
  );
}
