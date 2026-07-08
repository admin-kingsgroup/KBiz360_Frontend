import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverview } from './api/monitor';
import { overviewKpis, streamRows, actorName } from './utils/monitor';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { GroupHealth } from './GroupHealth';
import { SetupReadiness } from './SetupReadiness';
import { IntegritySummary } from './IntegritySummary';
import { ScrutinyTrend } from './ScrutinyTrend';

// Defer the heavy branch-wide live bands (health / integrity / trend each fan out over
// all 6 branches) until after first paint, so the Control Tower shell + governance
// overview render instantly and the live bands stream in a beat later — snappier first
// paint without hiding anything.
function useDeferredMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1));
    const cic = window.cancelIdleCallback || window.clearTimeout;
    const id = ric(() => setReady(true));
    return () => cic(id);
  }, []);
  return ready;
}

function Deferred({ minHeight = 96, children }) {
  const ready = useDeferredMount();
  if (!ready) return <div className="animate-pulse rounded-lg bg-surface-alt" style={{ minHeight }} aria-hidden="true" />;
  return children;
}

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

export function ControlTower({ setRoute } = {}) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'overview'], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000 });
  const o = q.data || {};
  const controls = o.controls || [];
  const events = o.recentEvents || [];

  return (
    <div className="grid gap-6">
      {/* Branch-wise health — the alerts engine wired in, worst branch first. Leads the
          Control Tower so issues/errors/setup gaps are the first thing seen. */}
      <PageSection title="Group Health — branchwise">
        <Deferred minHeight={160}><GroupHealth setRoute={setRoute} /></Deferred>
      </PageSection>

      {/* Setup / Configuration Readiness — every module still awaiting data entry or
          config, branchwise, riding the live adoption engine (auto-clears as data lands).
          Kept here in the Control Tower only — deliberately off the notification bell. */}
      <PageSection title="Setup & Configuration Readiness — pending data entry">
        <Deferred minHeight={160}><SetupReadiness setRoute={setRoute} /></Deferred>
      </PageSection>

      {/* Close-readiness — the SAP-style integrity/close gates, branchwise, in brief.
          Full gate × branch checklist lives at /tk/integrity. */}
      <PageSection title="Close Readiness & Integrity — branchwise">
        <Deferred minHeight={140}><IntegritySummary setRoute={setRoute} /></Deferred>
      </PageSection>

      {/* Scrutiny trend — is each branch's data quality improving (fixing faster than
          issues appear)? Built from the alert lifecycle. */}
      <PageSection title="Scrutiny Trend — is data quality improving?">
        <Deferred minHeight={120}><ScrutinyTrend /></Deferred>
      </PageSection>

      {/* Control plane — the governance/approval oversight this page originally carried. */}
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
