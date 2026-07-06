import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverview } from './api/monitor';
import { overviewKpis, streamRows, actorName } from './utils/monitor';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Control Tower (container) ───────────────────────────────
// The "is the control layer healthy?" view: headline KPIs, pending split by stream,
// which controls are live, and the most recent control events. Read-only; polls
// gently. Dormant-safe — with nothing happening it just shows zeros.
//
// Built from the shared design system (KpiTile · PageSection · Badge · DataTable +
// design tokens) so it matches the branch dashboards — no bespoke tables/inline hex.
const EVENT_COLS = [
  { key: 'action', header: 'Action' },
  { key: 'by', header: 'By', render: (r) => actorName(r.actor) },
  { key: 'branch', header: 'Branch', render: (r) => r.branch || '—' },
];

export function ControlTower() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'overview'], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000 });
  const o = q.data || {};
  const controls = o.controls || [];
  const events = o.recentEvents || [];

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-kpis">
        {overviewKpis(o).map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} color="#1a1c22" />
        ))}
      </ResponsiveGrid>

      <ResponsiveGrid cols={2} gap="md">
        <PageSection title="Pending by stream">
          <div className="grid gap-1">
            {streamRows(o).map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">{s.label}</span>
                <b className="tabular-nums text-ink">{s.value}</b>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection title="Controls">
          {controls.length ? (
            <div className="grid gap-1.5">
              {controls.map((c) => (
                <div key={c.key} className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{c.label}</span>
                  <Badge tone={c.enabled ? 'success' : 'neutral'} size="sm">{c.enabled ? 'ON' : 'off'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-subtle">No controls configured.</p>
          )}
        </PageSection>
      </ResponsiveGrid>

      <DataTable
        title="Recent control events"
        columns={EVENT_COLS}
        rows={events}
        getRowKey={(r, i) => `${i}`}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="No control events yet."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
