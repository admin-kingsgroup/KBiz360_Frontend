import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSetupReadiness } from './api/monitor';
import { readinessKpis, readinessRows, categoryRows, statusTone, statusLabel, severityTone } from './utils/setupReadiness';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Setup / Configuration Readiness (on the Control Tower) ───
// The "what still needs setting up before it works?" punch-list. Rides the live adoption
// engine (60s stale / 5-min refetch), so an item auto-clears the moment the team enters
// the data — nothing here is a hand-ticked checkbox. Branchwise, never blended. Read-only;
// dormant-safe. Kept OUT of the notification bell/dashboard on purpose — this is the one
// place these "module not set up yet" reminders live, so daily alerts aren't drowned.

const KPI_COLOR = { pending: '#1a1c22', error: '#b23b3b', warn: '#a86a10', branches: '#1a1c22' };

function issueColumns(setRoute) {
  return [
    { key: 'branch', header: 'Scope', render: (r) => (
      <Badge tone={r.scope === 'central' ? 'neutral' : 'info'} size="sm">{r.branch}</Badge>
    ) },
    { key: 'label', header: 'Module', render: (r) => (
      <div>
        <div className="font-medium text-ink">{r.label}</div>
        <div className="text-[11px] text-ink-subtle">{r.category}</div>
      </div>
    ) },
    { key: 'status', header: 'Status', align: 'center', render: (r) => (
      <Badge tone={statusTone(r.status)} size="sm">{statusLabel(r.status)}</Badge>
    ) },
    { key: 'detail', header: 'What is missing', render: (r) => (
      <span className="text-[11px] text-ink-muted">{r.detail}</span>
    ) },
    { key: 'link', header: '', align: 'right', render: (r) => (r.link
      ? <button type="button" onClick={() => (setRoute ? setRoute(r.link) : (window.location.href = r.link))} className="text-[12px] font-medium text-info hover:underline">Set up →</button>
      : null) },
  ];
}

export function SetupReadiness({ setRoute } = {}) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'readiness'], queryFn: getSetupReadiness, staleTime: 60_000, refetchInterval: 300_000 });
  const d = q.data || {};
  const kpis = readinessKpis(d);
  const rows = readinessRows(d);
  const cats = categoryRows(d);

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-readiness-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={(k.key === 'error' && Number(k.value) > 0) || (k.key === 'warn' && Number(k.value) > 0) ? KPI_COLOR[k.key] : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      <PageSection title="How readiness is tracked">
        <p className="text-xs text-ink-muted">
          Each module is checked against its live setup milestones (masters created? · limits/terms set? · has data this year?).
          A module is listed here until every milestone is met, then it drops off automatically — nothing is hand-ticked.
          <b> Not started</b> = no data entered yet · <b>In progress</b> = partly configured · <b>Awaiting setup</b> = feature needs enabling.
        </p>
      </PageSection>

      <DataTable
        title="Pending setup — modules awaiting data entry / configuration"
        columns={issueColumns(setRoute)}
        rows={rows}
        getRowKey={(r, i) => `${r.branch}:${r.key}:${i}`}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="Nothing pending — every module is fully set up."
        searchable
        showDensityToggle={false}
        zebra
      />

      {cats.length > 0 && (
        <PageSection title="Pending by area">
          <div className="grid gap-1.5">
            {cats.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">{c.category}</span>
                <span className="flex items-center gap-1.5">
                  {c.error > 0 && <Badge tone={severityTone('error')} size="sm">{c.error} not started</Badge>}
                  {c.warn > 0 && <Badge tone={severityTone('warn')} size="sm">{c.warn} in progress</Badge>}
                  {c.info > 0 && <Badge tone={severityTone('info')} size="sm">{c.info} awaiting</Badge>}
                </span>
              </div>
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}
