import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverview, getGroupHealth, getIntegrity, getTrend, getSetupReadiness } from './api/monitor';
import { overviewKpis, streamRows, actorName } from './utils/monitor';
import { scopeHealth, scopeSetup, scopeGates, scopeTrend, seriesMax } from './utils/controlTower';
import { SemiGauge, StackedBar, GateDots, DualLine, MiniBars, SEM } from './SummaryCharts';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { BandError } from './BandError';
import { GroupHealth } from './GroupHealth';
import { SetupReadiness } from './SetupReadiness';
import { IntegritySummary } from './IntegritySummary';
import { ScrutinyTrend } from './ScrutinyTrend';

// ─── TK GROUP · FE · Control Tower (container) ───────────────────────────────
// "Is the control layer healthy?" — split into SECTIONS via a tab bar (the same
// underline-tab pattern as the ERP Rules Manager) instead of one long scroll. The
// Overview tab shows every lens side-by-side as a SUMMARY CHART; the other tabs open
// one lens in full. The whole Tower is scoped by the top TK Group Central branch
// selector (the cockpit Focus) — the Overview charts read useCockpitFocus() and show
// group-wide or the focused branch. Only the active tab's band mounts (so a single
// lens fetches at a time); the shared query keys mean Overview + tab reuse one cache.

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'health', label: 'Group Health' },
  { id: 'setup', label: 'Setup Readiness' },
  { id: 'close', label: 'Close & Integrity' },
  { id: 'trend', label: 'Scrutiny Trend' },
  { id: 'gov', label: 'Governance' },
];

const EVENT_COLS = [
  { key: 'action', header: 'Action' },
  { key: 'by', header: 'By', render: (r) => actorName(r.actor) },
  { key: 'branch', header: 'Branch', render: (r) => r.branch || '—' },
];

function Legend({ items }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.filter((i) => i.show !== false).map((i, k) => (
        <span key={k} className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: i.color }} />
          {i.label}{i.value != null && <b className="ml-auto pl-3 tabular-nums text-ink">{i.value}</b>}
        </span>
      ))}
    </div>
  );
}

function LensCard({ title, onOpen, chart, legend, foot }) {
  return (
    <div className="flex flex-col rounded-xl border border-surface-border bg-surface p-4 shadow-pop">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-ink">{title}</span>
        {onOpen && <button type="button" onClick={onOpen} className="text-[11.5px] font-semibold text-accent hover:underline">Open →</button>}
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0">{chart}</div>
        {legend && <div className="min-w-0 flex-1">{legend}</div>}
      </div>
      {foot && <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs">{foot}</div>}
    </div>
  );
}

// ── Overview: every lens as a summary chart, scoped by the cockpit Focus ──
function Overview({ focus, goTab }) {
  const ov = useQuery({ queryKey: ['tk', 'monitor', 'overview'], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000 });
  const hq = useQuery({ queryKey: ['tk', 'monitor', 'health'], queryFn: getGroupHealth, staleTime: 60_000 });
  const iq = useQuery({ queryKey: ['tk', 'monitor', 'integrity'], queryFn: getIntegrity, staleTime: 60_000 });
  const tq = useQuery({ queryKey: ['tk', 'monitor', 'trend'], queryFn: getTrend, staleTime: 60_000 });
  const rq = useQuery({ queryKey: ['tk', 'monitor', 'readiness'], queryFn: getSetupReadiness, staleTime: 60_000 });

  const o = ov.data || {};
  const health = scopeHealth(hq.data, focus);
  const setup = scopeSetup(rq.data, focus);
  const gates = scopeGates(iq.data, focus);
  const ig = (iq.data && iq.data.group) || {}; // group close-ready count, for the ALL footer
  const trend = scopeTrend(tq.data, focus);
  const tmax = seriesMax(trend.opened, trend.fixed);
  const streams = streamRows(o);
  const controls = o.controls || [];
  const scopeLabel = (!focus || focus === 'ALL') ? 'All branches' : focus;
  const band = health.score >= 75 ? 'success' : health.score >= 60 ? 'warning' : 'danger';

  return (
    <div className="grid gap-4">
      <div className="text-xs text-ink-muted">
        Showing <b className="text-ink">{scopeLabel}</b> — every section below is scoped to the top TK Group Central selector.
      </div>

      <ResponsiveGrid min="150px" gap="md" data-testid="tk-kpis">
        {overviewKpis(o).map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} color="#1a1c22" />
        ))}
      </ResponsiveGrid>

      {ov.isError && <BandError label="control overview" onRetry={ov.refetch} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LensCard title="Group Health" onOpen={() => goTab('health')}
          chart={<SemiGauge value={health.score} />}
          legend={<Legend items={[{ label: `${health.label} score`, color: SEM[band === 'success' ? 'ok' : band === 'warning' ? 'warn' : 'err'] }]} />}
          foot={<><Badge tone={band} size="sm">{health.score >= 75 ? 'Healthy' : health.score >= 60 ? 'Watch' : 'At risk'}</Badge><span className="text-ink-subtle">100 − penalties</span></>} />

        <LensCard title="Setup Readiness" onOpen={() => goTab('setup')}
          chart={<div className="w-[130px]"><StackedBar segments={[{ value: setup.error, color: SEM.err }, { value: setup.warn, color: SEM.warn }, { value: setup.info, color: SEM.info }]} /></div>}
          legend={<Legend items={[{ label: 'Not started', value: setup.error, color: SEM.err }, { label: 'In progress', value: setup.warn, color: SEM.warn }, { label: 'Awaiting', value: setup.info, color: SEM.info }]} />}
          foot={<><span className="text-ink-subtle">modules built, not set up</span><Badge tone={setup.total ? 'danger' : 'success'} size="sm">{setup.total} pending</Badge></>} />

        <LensCard title="Close & Integrity" onOpen={() => goTab('close')}
          chart={<GateDots pass={gates.pass} warn={gates.warn} fail={gates.fail} na={gates.na} />}
          legend={<Legend items={[{ label: 'Pass', value: gates.pass, color: SEM.ok }, { label: 'Warn', value: gates.warn, color: SEM.warn }, { label: 'Fail', value: gates.fail, color: SEM.err }]} />}
          foot={(!focus || focus === 'ALL')
            ? <><span className="text-ink-subtle">gates, worst-of branches</span><Badge tone={ig.totalBranches && ig.closeReadyBranches === ig.totalBranches ? 'success' : 'warning'} size="sm">{ig.closeReadyBranches || 0}/{ig.totalBranches || 0} branches ready</Badge></>
            : <><span className="text-ink-subtle">SAP-style gates</span><Badge tone={gates.fail ? 'danger' : gates.warn ? 'warning' : 'success'} size="sm">{gates.pass}/{gates.total} pass</Badge></>} />

        <LensCard title="Scrutiny Trend" onOpen={() => goTab('trend')}
          chart={<div className="w-[150px]"><DualLine a={trend.fixed} b={trend.opened} max={tmax} height={70} aColor={SEM.ok} /></div>}
          legend={<Legend items={[{ label: 'Fixed / week', color: SEM.ok }, { label: 'Opened', color: SEM.err }]} />}
          foot={<span className="text-ink-subtle">fixed vs opened, last weeks</span>} />

        <LensCard title="Governance" onOpen={() => goTab('gov')}
          chart={<div className="w-[150px]"><MiniBars items={streams.map((s) => ({ label: s.label, value: s.value, color: SEM.accent }))} /></div>}
          foot={<><span className="text-ink-subtle">approvals waiting</span><Badge tone={o.pendingTotal ? 'info' : 'neutral'} size="sm">{o.pendingTotal || 0} pending</Badge></>} />

        <LensCard title="Controls"
          chart={<div className="grid w-full gap-1.5">
            {controls.length ? controls.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-ink-muted">{c.label}</span>
                <Badge tone={c.enabled ? 'success' : 'neutral'} size="sm">{c.enabled ? 'ON' : 'off'}</Badge>
              </div>
            )) : <span className="text-xs text-ink-subtle">No controls configured.</span>}
          </div>} />
      </div>
    </div>
  );
}

// ── Governance tab: the control plane in detail ──
function Governance() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'overview'], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000 });
  const o = q.data || {};
  const controls = o.controls || [];
  const events = o.recentEvents || [];
  if (q.isError) return <BandError label="governance" onRetry={q.refetch} />;
  return (
    <div className="grid gap-4">
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

export function ControlTower({ setRoute } = {}) {
  const focus = useCockpitFocus();
  const [tab, setTab] = useState('overview');
  return (
    <div className="grid gap-5">
      <div className="flex gap-1 overflow-x-auto border-b border-surface-border">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview focus={focus} goTab={setTab} />}
      {tab === 'health' && <GroupHealth setRoute={setRoute} />}
      {tab === 'setup' && <SetupReadiness setRoute={setRoute} />}
      {tab === 'close' && <IntegritySummary setRoute={setRoute} />}
      {tab === 'trend' && <ScrutinyTrend />}
      {tab === 'gov' && <Governance />}
    </div>
  );
}
