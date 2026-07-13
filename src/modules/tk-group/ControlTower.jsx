import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOverview, getGroupHealth, getIntegrity, getTrend, getSetupReadiness, getDevFindings } from './api/monitor';
import { overviewKpis, streamRows, actorName } from './utils/monitor';
import { scopeHealth, scopeSetup, scopeGates, scopeTrend, seriesMax } from './utils/controlTower';
import { SemiGauge, StackedBar, GateDots, DualLine, MiniBars, SEM } from './SummaryCharts';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { CodeScanPanel, useCodeScan } from '../devControl/CodeScanPanel';
import { BandError } from './BandError';
import { GroupHealth } from './GroupHealth';
import { SetupReadiness } from './SetupReadiness';
import { ModulesHealth } from './ModulesHealth';
import { IntegritySummary } from './IntegritySummary';
import { ScrutinyTrend } from './ScrutinyTrend';
// Development findings share the Dev Control registry + tracking rows — the SAME
// clearing rule (registry row live, or tracked done/won't-do). Fixing an item in
// /dev/control clears its finding here automatically; the shared react-query key
// ['dev-control','status'] keeps both screens on one cache.
import { ALL_ITEMS as DEV_ITEMS, STATUS_META as DEV_STATUS_META, moduleRollup, VERDICT_META, isDevPending, isCleared as devCleared, isDormant as devDormant } from '../devControl/registry';

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
  { id: 'dev', label: 'Development' },
  { id: 'gov', label: 'Governance' },
  // Task List retired — its by-module punch-list, per-user worklist, party
  // completeness and coverage now live inside Modules Health (one home). The old
  // `?tab=tasks` deep-link is redirected there below so existing links still work.
  { id: 'modules-health', label: 'Modules Health' },
];

// ── Development findings — Dev Control's open items surfaced as a Tower lens ──
function useDevFindings() {
  const trackQ = useQuery({
    queryKey: ['dev-control', 'status'], // same key as /dev/control → one cache
    queryFn: getDevFindings,
    staleTime: 30_000,
  });
  const trackMap = {};
  (trackQ.data || []).forEach((r) => { trackMap[r.itemId] = r; });
  // Dormant = built + intentionally OFF until go-live — not developer work,
  // so it is surfaced separately, never as an open finding.
  const open = DEV_ITEMS.filter((i) => isDevPending(i, trackMap[i.id]));
  const dormant = DEV_ITEMS.filter((i) => !devCleared(i, trackMap[i.id]) && devDormant(i));
  return { open, dormant, trackMap, isLoading: trackQ.isLoading };
}

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
        <div className={legend ? 'shrink-0' : 'min-w-0 flex-1'}>{chart}</div>
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

        <DevLensCard goTab={goTab} />

      </div>

      <LensCard title="Controls"
        chart={<div className="grid w-full grid-cols-1 gap-1">
          {controls.length ? controls.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-xs odd:bg-surface-alt/50">
              <span className="min-w-0 text-ink-muted">{c.label}</span>
              <Badge tone={c.enabled ? 'success' : 'neutral'} size="sm">{c.enabled ? 'ON' : 'off'}</Badge>
            </div>
          )) : <span className="text-xs text-ink-subtle">No controls configured.</span>}
        </div>} />
    </div>
  );
}

// ── Development lens card (Overview) — is dev work blocking the ERP? ──
// Folds the LIVE code scan (broken imports, dead routes, placeholders…) together
// with the hand-maintained registry, so the Overview highlights automated issues
// the moment they appear — not only what a developer remembered to log.
function DevLensCard({ goTab }) {
  const { open, dormant } = useDevFindings();
  const { scan } = useCodeScan();
  const scanHigh = scan.counts.bySeverity.high || 0;
  const scanTotal = scan.counts.total || 0;
  const registryOpen = open.length;
  const total = scanTotal + registryOpen;
  return (
    <LensCard title="Development" onOpen={() => goTab('dev')}
      chart={<div className="w-[130px]"><StackedBar segments={[{ value: scanHigh, color: SEM.err }, { value: scanTotal - scanHigh, color: SEM.warn }, { value: registryOpen, color: SEM.info }]} /></div>}
      legend={<Legend items={[
        { label: 'Scanner — high', value: scanHigh, color: SEM.err },
        { label: 'Scanner — other', value: scanTotal - scanHigh, color: SEM.warn },
        { label: 'Registry open', value: registryOpen, color: SEM.info },
      ]} />}
      foot={<><span className="text-ink-subtle">auto-scan + registry</span><Badge tone={scanHigh ? 'danger' : total ? 'warning' : 'success'} size="sm">{total ? `${total} to fix` : 'clear'}</Badge></>} />
  );
}

// ── Development tab: module verdicts + every open dev finding with its fix remark.
//    Read-only mirror of /dev/control — fix and mark Done THERE; it clears here. ──
const DEV_COLS = [
  { key: 'status', header: 'Status', render: (r) => {
    const m = DEV_STATUS_META[r.status] || DEV_STATUS_META.audit;
    return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: m.color, background: m.bg }}>{m.label}</span>;
  } },
  { key: 'name', header: 'Feature', render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-[11px] text-ink-subtle">{r.area}</div></div> },
  { key: 'note', header: "What's wrong", render: (r) => <span className="text-ink-muted">{r.note || '—'}</span> },
  { key: 'remark', header: 'How to fix (remark)', render: (r) => <span className="text-ink">{r.remark || '—'}</span> },
  { key: 'owner', header: 'Owner / progress', render: (r) => r._tracked
    ? <span className="text-[11px] text-ink-muted">{r._tracked.owner || 'unassigned'}{r._tracked.status && r._tracked.status !== 'open' ? ` · ${r._tracked.status}` : ''}{r._tracked.dueDate ? ` · due ${r._tracked.dueDate}` : ''}</span>
    : <span className="text-[11px] text-ink-subtle">unassigned</span> },
];

function DevelopmentLens({ setRoute }) {
  const { open, dormant, trackMap, isLoading } = useDevFindings();
  const rollup = moduleRollup(trackMap);
  const rows = open.map((i) => ({ ...i, _tracked: trackMap[i.id] }));
  const dormantRows = dormant.map((i) => ({ ...i, _tracked: trackMap[i.id] }));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>
          Two sources feed this lens: the <b>automated code scan</b> below (re-run on every refresh) and the
          <b> developer registry</b> (hand-tracked features). Fix a scan issue in the code and it clears on the next
          scan; mark a registry item <b>Done</b> in Developer Control (or flip its row to <b>live</b>) and it clears here.
        </span>
        {setRoute && (
          <button type="button" onClick={() => setRoute('/dev/control')} className="whitespace-nowrap text-[11.5px] font-semibold text-accent hover:underline">
            Open Developer Control →
          </button>
        )}
      </div>

      {/* ── LIVE automated scan ── */}
      <CodeScanPanel />

      {/* ── registry-tracked module verdicts + findings ── */}
      <div className="pt-1 text-[12px] font-semibold text-ink">Developer registry — tracked features</div>
      <ResponsiveGrid min="190px" gap="md">
        {rollup.map((m) => {
          const vm = VERDICT_META[m.verdict];
          return (
            <div key={m.area} className="rounded-lg border border-surface-border bg-surface p-3" style={{ borderLeft: `4px solid ${vm.color}` }}>
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-[12.5px] leading-tight text-ink">{m.area}</b>
                <span className="tabular-nums text-[11px] text-ink-subtle">{m.cleared}/{m.total}</span>
              </div>
              <div className="mt-1.5 text-[11px]">
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, color: vm.color, background: vm.bg }}>{vm.label}</span>
              </div>
            </div>
          );
        })}
      </ResponsiveGrid>

      <DataTable
        title={`Open development findings (${rows.length})`}
        columns={DEV_COLS}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={isLoading}
        emptyMessage="No development findings open — every tracked feature is wired or cleared. 🎉"
        searchable
        showDensityToggle={false}
        zebra
      />

      {dormantRows.length > 0 && (
        <DataTable
          title={`Dormant by design — built, switched off until go-live (${dormantRows.length})`}
          columns={DEV_COLS}
          rows={dormantRows}
          getRowKey={(r) => r.id}
          emptyMessage="Nothing dormant."
          showDensityToggle={false}
          zebra
        />
      )}
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
  // Tab lives in the URL (`?tab=`), not plain state, so the header/browser Back
  // button steps back through tab switches one at a time instead of skipping
  // straight past this whole page — a bare setState here leaves no history entry,
  // so Back (which drives real browser history) jumps to whatever page was open
  // BEFORE Control Tower, ignoring every tab you clicked through on the way here.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  // Legacy redirect: the retired Task List tab folds into Modules Health.
  const resolvedParam = tabParam === 'tasks' ? 'modules-health' : tabParam;
  const tab = TABS.some((t) => t.id === resolvedParam) ? resolvedParam : 'overview';
  const setTab = (id) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('tab', id); return p; });
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
      {tab === 'dev' && <DevelopmentLens setRoute={setRoute} />}
      {tab === 'gov' && <Governance />}
      {tab === 'modules-health' && <ModulesHealth setRoute={setRoute} />}
    </div>
  );
}
