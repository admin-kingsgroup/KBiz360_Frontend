/* ════════════════════════════════════════════════════════════════════
   MODULES/DEV-CONTROL/DEV-CONTROL-PAGE.JSX — Developer Control Tower
   ════════════════════════════════════════════════════════════════════
   Super-Admin-only engineering cockpit, built like TK Group's Control
   Tower / Close-Readiness: it tells the DEVELOPER what is pending from
   their end to complete the ERP end to end, the same way the Control
   Tower tells the finance team what blocks the close.

   ▸ KPI tiles       — wired vs pending vs in-progress vs cleared
   ▸ Area readiness  — per-area completion cards, worst first
   ▸ Pending board   — every not-yet-live registry item is a FINDING:
                       expandable, assignable (owner / status / due /
                       note) — persisted via POST /api/dev-control,
                       mirroring the Control Tower's finding-status
   ▸ Live API checks — probes every major backend mount
   ▸ Wired reference — everything already live, plus runbook & gotchas

   Item DEFINITIONS live in ./registry.js (hand-maintained — update a
   row's status to 'live' when it's truly wired; its finding then
   disappears from the board and any assignment is moot, exactly like a
   Control-Tower gate clearing). Tracking rows only layer ownership on
   top.

   Gated twice: the App.jsx route renders a lock card for non-Super-
   Admins, and this component re-checks the role (defense in depth).
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { PageSection, ResponsiveGrid, Badge, Button, Input, Select, FormField, FilterBar } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { getAuthToken, API_BASE, apiGet, apiPost } from '../../core/api';
import { APP_ROUTES } from '../../core/routeManifest.generated';
import { DEV_REGISTRY, ALL_ITEMS, STATUS_META, TRACK_META, SEVERITY_ORDER, RUNBOOK, KNOWN_ISSUES, HEALTH_CHECKS, isCleared, isDormant, moduleRollup, VERDICT_META } from './registry';
import { CodeScanPanel } from './CodeScanPanel';

const isSuperAdmin = (u) => ['Super Admin', 'super_admin'].includes(u?.role || '');

async function getDevStatus() {
  try { return (await apiGet('/api/dev-control'))?.items || []; } catch { return []; }
}
const saveDevStatus = (row) => apiPost('/api/dev-control', row);

/* ── status pills ─────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.audit;
  return (
    <span title={m.desc} style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11,
      fontWeight: 700, whiteSpace: 'nowrap', color: m.color, background: m.bg,
      border: `1px solid ${m.color}33`,
    }}>{m.label}</span>
  );
}

function TrackPill({ status }) {
  const m = TRACK_META[status];
  if (!m) return null;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

/* ── assignment bar — the Control Tower AssignBar, plus Note + terminal
      statuses (done / won't-do) so a finding can be closed from here ── */
function AssignBar({ itemId, current, onSave, saving }) {
  const [owner, setOwner] = useState((current && current.owner) || '');
  const [status, setStatus] = useState((current && current.status) || 'open');
  const [dueDate, setDueDate] = useState((current && current.dueDate) || '');
  const [note, setNote] = useState((current && current.note) || '');
  return (
    <div className="flex flex-wrap items-end gap-2 bg-surface-alt/60 px-4 py-2">
      <FormField label="Owner"><Input value={owner} placeholder="assignee" onChange={(e) => setOwner(e.target.value)} /></FormField>
      <FormField label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(TRACK_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
      </FormField>
      <FormField label="Due"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></FormField>
      <FormField label="Note" className="min-w-[220px] flex-1">
        <Input value={note} placeholder="progress / blocker note" onChange={(e) => setNote(e.target.value)} />
      </FormField>
      <Button size="sm" loading={saving} onClick={() => onSave({ itemId, owner: owner.trim(), status, dueDate, note: note.trim() })}>Save</Button>
      {current && current.updatedBy && <span className="pb-2 text-[11px] text-ink-subtle">last set by {current.updatedBy}</span>}
    </div>
  );
}

/* ── one finding row on the pending board ─────────────────────────── */
function FindingRow({ item, tracked, setRoute, onSave, saving }) {
  const [open, setOpen] = useState(false);
  const hasOwner = tracked && (tracked.owner || (tracked.status && tracked.status !== 'open') || tracked.dueDate);
  return (
    <div className="rounded-lg border border-surface-border bg-surface">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-alt">
        <span className="w-3 text-ink-subtle">{open ? '▾' : '▸'}</span>
        <StatusPill status={item.status} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{item.name}</span>
          <span className="block truncate text-[11px] text-ink-subtle">{item.area}</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {hasOwner && (
            <Badge tone="info" size="sm">
              {tracked.owner || 'assigned'}{tracked.status !== 'open' ? ` · ${TRACK_META[tracked.status]?.label || tracked.status}` : ''}{tracked.dueDate ? ` · due ${tracked.dueDate}` : ''}
            </Badge>
          )}
        </span>
      </button>
      {open && (
        <div className="border-t border-surface-border pb-1">
          {/* key on the tracking row id so the form re-inits once the saved
              assignment loads (avoids saving blank over an existing one) */}
          <AssignBar key={tracked?._id || 'unassigned'} itemId={item.id} current={tracked} saving={saving} onSave={onSave} />
          <div className="grid gap-1 px-4 py-2 text-xs">
            {item.note && <p className="leading-relaxed text-ink-muted"><b>What's wrong:</b> {item.note}</p>}
            {item.remark && (
              <p className="rounded-md px-2.5 py-1.5 leading-relaxed" style={{ background: '#fff8e1', color: '#5a4a00' }}>
                <b>How to fix:</b> {item.remark}
              </p>
            )}
            {tracked?.note && <p className="leading-relaxed text-ink"><b>Progress note:</b> {tracked.note}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-1">
              {(item.routes || []).map((r) => (
                <a key={r} onClick={() => setRoute && setRoute(r)} className="cursor-pointer font-mono text-[11px] text-brand hover:underline" style={{ color: '#0070f2' }}>{r}</a>
              ))}
              {(item.api || []).map((a) => <span key={a} className="font-mono text-[11px] text-ink-subtle">{a}</span>)}
            </div>
            <p className="pt-1 text-[11px] text-ink-subtle">
              When this is truly wired end-to-end, flip its row to <b>live</b> in src/modules/devControl/registry.js — the finding then clears from this board automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── live API wiring checks ───────────────────────────────────────── */
function useHealthChecks() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true); setResults({});
    const token = getAuthToken();
    await Promise.all(HEALTH_CHECKS.map(async (c) => {
      const t0 = performance.now();
      let entry;
      try {
        const res = await fetch(`${API_BASE}${c.path}`, { method: c.method || 'GET', headers: { Authorization: `Bearer ${token}` } });
        const ms = Math.round(performance.now() - t0);
        entry = res.ok ? { state: 'ok', http: res.status, ms } : { state: res.status >= 500 ? 'error' : 'warn', http: res.status, ms };
      } catch (e) {
        entry = { state: 'down', http: null, ms: Math.round(performance.now() - t0), msg: e.message };
      }
      setResults((prev) => ({ ...prev, [c.path]: entry }));
    }));
    setRunning(false);
  };
  return { results, running, run };
}

const CHECK_COLORS = {
  ok:    { color: '#1a7f37', bg: '#e6f4ea', label: 'OK' },
  warn:  { color: '#9a6700', bg: '#fff8e1', label: 'Reachable' },
  error: { color: '#cf222e', bg: '#ffebe9', label: '5xx' },
  down:  { color: '#cf222e', bg: '#ffebe9', label: 'DOWN' },
};

function HealthSection() {
  const { results, running, run } = useHealthChecks();
  const done = Object.keys(results).length;
  const downs = Object.values(results).filter((r) => r.state === 'down' || r.state === 'error').length;
  return (
    <PageSection
      title="Live API wiring check"
      subtitle={`Probes every major backend mount at ${API_BASE}. 2xx/4xx = mounted & reachable (4xx usually just wants params/role); network failure = down.`}
      actions={
        <Button size="sm" onClick={run} loading={running}>
          {running ? `Checking… ${done}/${HEALTH_CHECKS.length}` : done ? 'Re-run checks' : 'Run checks'}
        </Button>
      }
    >
      {done === 0 && !running ? (
        <p className="text-xs text-ink-subtle">Not run yet — click “Run checks” to probe all {HEALTH_CHECKS.length} API mounts.</p>
      ) : (
        <div className="grid gap-2">
          {downs > 0 && <p className="text-xs font-semibold" style={{ color: '#cf222e' }}>{downs} endpoint{downs > 1 ? 's' : ''} down or erroring.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
            {HEALTH_CHECKS.map((c) => {
              const r = results[c.path];
              const cc = r ? CHECK_COLORS[r.state] : null;
              return (
                <div key={c.path} className="flex items-center justify-between gap-2 rounded-lg border border-surface-border px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{c.label}</div>
                    <div className="truncate font-mono text-[10.5px] text-ink-subtle">{c.method || 'GET'} {c.path}</div>
                  </div>
                  {r ? (
                    <span title={r.msg || ''} style={{ color: cc.color, background: cc.bg, padding: '2px 8px', borderRadius: 999, fontWeight: 700, fontSize: 10.5, whiteSpace: 'nowrap' }}>
                      {cc.label}{r.http ? ` · ${r.http}` : ''} · {r.ms}ms
                    </span>
                  ) : <span className="text-[11px] text-ink-subtle">{running ? '…' : ''}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageSection>
  );
}

/* ── module status — every module, working or not, with fix remarks ── */
function VerdictPill({ verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span title={m.desc} style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11,
      fontWeight: 700, whiteSpace: 'nowrap', color: m.color, background: m.bg,
      border: `1px solid ${m.color}33`,
    }}>{m.label}</span>
  );
}

function ModuleStatusSection({ trackMap, setRoute }) {
  const rollup = useMemo(() => moduleRollup(trackMap), [trackMap]);
  const [openArea, setOpenArea] = useState(null);
  const working = rollup.filter((r) => r.verdict === 'working').length;
  return (
    <PageSection
      title="Module status — what fully works, what doesn't"
      subtitle={`Every module of the ERP with a working verdict. ${working} of ${rollup.length} modules fully working. Expand a module to see exactly what's not working and the remark on how to fix it.`}
    >
      <div className="grid gap-1.5">
        {rollup.map((m) => {
          const open = openArea === m.area;
          return (
            <div key={m.area} className="rounded-lg border border-surface-border bg-surface">
              <button type="button" onClick={() => setOpenArea(open ? null : m.area)} aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-alt">
                <span className="w-3 text-ink-subtle">{m.open.length ? (open ? '▾' : '▸') : '·'}</span>
                <VerdictPill verdict={m.verdict} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{m.area}</span>
                <span className="ml-auto flex shrink-0 items-center gap-3">
                  <span className="text-[11px] tabular-nums text-ink-subtle">{m.cleared}/{m.total} items working</span>
                  {(m.dormant || []).length > 0 && <Badge tone="info" size="sm">{m.dormant.length} dormant by design</Badge>}
                  {m.open.length > 0 && <Badge tone={m.verdict === 'broken' ? 'danger' : 'warning'} size="sm">{m.open.length} to fix</Badge>}
                </span>
              </button>
              {open && m.open.length > 0 && (
                <div className="grid gap-2 border-t border-surface-border px-4 py-3">
                  {m.open.map((i) => (
                    <div key={i.id} className="grid gap-1 rounded-md border border-surface-border/60 p-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={i.status} />
                        <b className="text-ink">{i.name}</b>
                        {(i.routes || []).slice(0, 2).map((r) => (
                          <a key={r} onClick={() => setRoute && setRoute(r)} className="cursor-pointer font-mono text-[10.5px]" style={{ color: '#0070f2' }}>{r}</a>
                        ))}
                      </div>
                      {i.note && <p className="leading-relaxed text-ink-muted"><b>What's wrong:</b> {i.note}</p>}
                      {i.remark && (
                        <p className="rounded-md px-2.5 py-1.5 leading-relaxed" style={{ background: '#fff8e1', color: '#5a4a00' }}>
                          <b>How to fix:</b> {i.remark}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}

/* ── reference table columns (wired features + full registry) ─────── */
const REF_COLS = (setRoute) => [
  { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
  { key: 'name', header: 'Feature', render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-[11px] text-ink-subtle">{r.area}</div></div> },
  { key: 'note', header: 'Developer notes', render: (r) => <span className="text-ink-muted">{r.note || '—'}</span> },
  { key: 'where', header: 'Where', render: (r) => (
    <div>
      {(r.routes || []).map((x) => <a key={x} onClick={() => setRoute && setRoute(x)} className="block cursor-pointer font-mono text-[11px]" style={{ color: '#0070f2' }}>{x}</a>)}
      {(r.api || []).map((x) => <span key={x} className="block font-mono text-[11px] text-ink-subtle">{x}</span>)}
    </div>
  ) },
];

/* ── main page ────────────────────────────────────────────────────── */

export function DevControlPage({ setRoute, currentUser }) {
  const [sevFilter, setSevFilter] = useState('');   // '' = all severities
  const [q, setQ] = useState('');
  const [showCleared, setShowCleared] = useState(false);

  const qc = useQueryClient();
  const trackQ = useQuery({ queryKey: ['dev-control', 'status'], queryFn: getDevStatus, staleTime: 30_000, enabled: isSuperAdmin(currentUser) });
  const trackMap = useMemo(() => { const m = {}; (trackQ.data || []).forEach((r) => { m[r.itemId] = r; }); return m; }, [trackQ.data]);
  const save = useMutation({ mutationFn: saveDevStatus, onSuccess: () => qc.invalidateQueries({ queryKey: ['dev-control', 'status'] }) });

  /* Split the registry into the pending board vs dormant-by-design vs cleared,
     Control-Tower style. Dormant = built, intentionally OFF until go-live — a
     go-live switch, not developer work, so it gets its own section. */
  const { pending, dormant, cleared, inProgress } = useMemo(() => {
    const p = []; const d = []; const c = []; let ip = 0;
    for (const item of ALL_ITEMS) {
      const t = trackMap[item.id];
      if (isCleared(item, t)) c.push(item);
      else if (isDormant(item)) d.push(item);
      else { p.push(item); if (t?.status === 'in-progress') ip += 1; }
    }
    p.sort((a, b) => (SEVERITY_ORDER[a.status] ?? 9) - (SEVERITY_ORDER[b.status] ?? 9));
    return { pending: p, dormant: d, cleared: c, inProgress: ip };
  }, [trackMap]);

  /* Dormant features are COMPLETE from the developer's side (built + verified,
     awaiting the go-live switch), so they count toward completion. */
  const completionPct = Math.round(((cleared.length + dormant.length) / ALL_ITEMS.length) * 100);

  /* Per-area completion — worst first, like branch close-readiness cards. */
  const areaCards = useMemo(() => DEV_REGISTRY.map((a) => {
    const total = a.items.length;
    const done = a.items.filter((i) => isCleared(i, trackMap[i.id]) || isDormant(i)).length;
    return { area: a.area, total, done, open: total - done, pct: Math.round((done / total) * 100) };
  }).sort((x, y) => x.pct - y.pct), [trackMap]);

  const needle = q.trim().toLowerCase();
  const boardItems = pending.filter((i) =>
    (!sevFilter || i.status === sevFilter) &&
    (!needle ||
      i.name.toLowerCase().includes(needle) ||
      i.area.toLowerCase().includes(needle) ||
      (i.note || '').toLowerCase().includes(needle) ||
      (i.routes || []).some((r) => r.includes(needle)) ||
      (i.api || []).some((a) => a.includes(needle))));

  if (!isSuperAdmin(currentUser)) {
    return (
      <div style={{ padding: 30, maxWidth: 560, margin: '40px auto', background: '#fff', borderRadius: 10, border: '1px solid #cdd1d8', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 14 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px', color: '#0d1326', fontSize: 20 }}>Developer Control</h2>
        <p style={{ margin: '0 0 20px', color: '#5a6691', fontSize: 13.5, lineHeight: 1.5 }}>
          This engineering console is restricted to the Super Admin.
        </p>
        <button onClick={() => setRoute && setRoute('/dashboard')}
          style={{ background: '#0d1326', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <PHASE2_Page
      title="Developer Control Tower"
      subtitle={`What is pending from the developer to complete this ERP end to end — ${ALL_ITEMS.length} tracked features · ${APP_ROUTES.length} app routes. Definitions in src/modules/devControl/registry.js; assignments persist via /api/dev-control.`}
    >
      <div className="grid gap-5">

        {/* ── headline KPIs ── */}
        <ResponsiveGrid min="150px" gap="md" data-testid="dev-kpis">
          <KpiTile label="ERP completion" value={`${completionPct}%`} sub={`${cleared.length + dormant.length} of ${ALL_ITEMS.length} cleared`} color={completionPct >= 80 ? '#1a7f37' : '#9a6700'} />
          <KpiTile label="Pending from developer" value={pending.length} sub="findings on the board" color={pending.length ? '#cf222e' : '#1a7f37'} />
          <KpiTile label="In progress" value={inProgress} sub="assigned & being worked" color="#0969da" />
          <KpiTile label="Wired live" value={ALL_ITEMS.filter((i) => i.status === 'live').length} sub="verified end-to-end" color="#1a7f37" />
          <KpiTile label="Dormant by design" value={dormant.length} sub="built — awaiting go-live switch" color="#0969da" />
          <KpiTile label="Needs audit" value={pending.filter((i) => i.status === 'audit').length} sub="wiring unverified" color="#57606a" />
        </ResponsiveGrid>

        {/* ── LIVE automated code scan — re-runs on every refresh ── */}
        <CodeScanPanel subtitle="Auto-runs on every ERP refresh. Walks the frontend + backend source on disk and flags broken imports, dead routes, placeholder screens, dead buttons and unresolved TODOs — each with a how-to-fix remark. These are found in the CODE (distinct from the hand-tracked registry findings below); fix them in source and they clear on the next scan." />

        {/* ── module status — working / not-working verdict per module ── */}
        <ModuleStatusSection trackMap={trackMap} setRoute={setRoute} />

        {/* ── area readiness — worst first ── */}
        <PageSection title="Area readiness — worst first" subtitle="Per module area: how much is wired or cleared vs still pending from the developer.">
          <ResponsiveGrid min="170px" gap="md">
            {areaCards.map((c) => (
              <div key={c.area} className="rounded-lg border border-surface-border bg-surface p-3"
                style={{ borderLeft: `4px solid ${c.open === 0 ? '#1a7f37' : c.pct >= 60 ? '#9a6700' : '#cf222e'}` }}>
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[12.5px] leading-tight text-ink">{c.area}</b>
                  <span className="tabular-nums text-lg font-extrabold" style={{ color: c.open === 0 ? '#1a7f37' : c.pct >= 60 ? '#9a6700' : '#cf222e' }}>{c.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.open === 0 ? '#1a7f37' : c.pct >= 60 ? '#9a6700' : '#cf222e' }} />
                </div>
                <div className="mt-1.5 text-[11px]">
                  {c.open === 0
                    ? <Badge tone="success" size="sm">Complete</Badge>
                    : <Badge tone="danger" size="sm">{c.open} item(s) pending</Badge>}
                </div>
              </div>
            ))}
          </ResponsiveGrid>
        </PageSection>

        {/* ── THE BOARD — pending from the developer ── */}
        <PageSection
          title="Pending from the developer — what blocks ERP completion"
          subtitle="Every feature not yet wired end-to-end, worst first. Expand a finding for the What's-wrong note and the How-to-fix remark; assign an owner, set status / due date, leave a progress note. Mark Done / Won't do (or flip the registry row to 'live') to clear it — it also clears from the TK Control Tower's Development lens automatically."
        >
          <FilterBar className="mb-2">
            <Select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} aria-label="Filter by severity">
              <option value="">All severities</option>
              {Object.entries(STATUS_META).filter(([k]) => k !== 'live').map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search findings, routes, APIs…" className="min-w-[240px] flex-1" />
          </FilterBar>
          {boardItems.length ? (
            <div className="grid gap-1.5">
              {boardItems.map((item) => (
                <FindingRow key={item.id} item={item} tracked={trackMap[item.id]} setRoute={setRoute}
                  saving={save.isPending} onSave={(r) => save.mutate(r)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-subtle">
              {pending.length ? 'No findings match the filter.' : 'Nothing pending — every tracked feature is wired or cleared. 🎉'}
            </p>
          )}
        </PageSection>

        {/* ── dormant by design — built, awaiting the go-live switch ── */}
        {dormant.length > 0 && (
          <PageSection
            title={`Dormant by design — built, switched off until go-live (${dormant.length})`}
            subtitle="No developer work pending on these: each is fully built and deliberately disabled behind a flag/config recorded in its note. Engage the switch at go-live."
          >
            <DataTable
              columns={REF_COLS(setRoute)}
              rows={dormant}
              getRowKey={(r) => r.id}
              emptyMessage="Nothing dormant."
              showDensityToggle={false}
              zebra
            />
          </PageSection>
        )}

        {/* ── cleared (done / won't-do / live) ── */}
        <PageSection
          title={`Cleared — wired live or closed (${cleared.length})`}
          actions={<Button size="sm" variant="ghost" onClick={() => setShowCleared(!showCleared)}>{showCleared ? 'Hide' : 'Show'}</Button>}
        >
          {showCleared ? (
            <DataTable
              columns={REF_COLS(setRoute)}
              rows={cleared}
              getRowKey={(r) => r.id}
              loading={trackQ.isLoading}
              emptyMessage="Nothing cleared yet."
              searchable
              showDensityToggle={false}
              zebra
            />
          ) : <p className="text-xs text-ink-subtle">{cleared.length} feature(s) wired live or closed. Click Show to list them.</p>}
        </PageSection>

        {/* ── live API probes ── */}
        <HealthSection />

        {/* ── script runbook ── */}
        <PageSection title="Script runbook (backend)" subtitle="Every scripted operation and how dangerous it is. ERP and CRM share ONE database — read before running anything.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-left text-ink-subtle">
                  <th className="py-1.5 pr-3 font-medium">Command</th><th className="pr-3 font-medium">Risk</th><th className="font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {RUNBOOK.map((s) => {
                  const col = s.danger === 'FATAL' ? '#cf222e' : s.danger === 'RISKY' ? '#9a6700' : '#1a7f37';
                  return (
                    <tr key={s.cmd} className="border-t border-surface-border/60 align-top">
                      <td className="py-2 pr-3 font-mono text-[11px] font-semibold text-ink">{s.cmd}</td>
                      <td className="pr-3 font-extrabold" style={{ color: col }}>{s.danger}</td>
                      <td className="leading-relaxed text-ink-muted">{s.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* ── known gotchas ── */}
        <PageSection title="Known issues & gotchas" subtitle="Things that repeatedly bite during development.">
          <ul className="grid list-disc gap-2 pl-5">
            {KNOWN_ISSUES.map((g) => <li key={g} className="text-xs leading-relaxed text-ink-muted">{g}</li>)}
          </ul>
        </PageSection>

      </div>
    </PHASE2_Page>
  );
}

export default DevControlPage;
