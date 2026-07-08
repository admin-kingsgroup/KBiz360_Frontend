import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSetupReadiness } from './api/monitor';
import { readinessKpis, readinessRows, categoryRows, branchRows, statusTone, statusLabel, severityTone, ownerTone } from './utils/setupReadiness';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';

// ─── TK GROUP · FE · Setup / Configuration Readiness (on the Control Tower) ───
// The "what still needs setting up before it works?" punch-list. Rides the live adoption
// engine (60s stale / 5-min refetch), so an item auto-clears the moment the team enters
// the data — nothing here is a hand-ticked checkbox. Branchwise, never blended. Read-only;
// dormant-safe. Kept OUT of the notification bell/dashboard on purpose — this is the one
// place these "module not set up yet" reminders live, so daily alerts aren't drowned.
//
// A branch SEPARATOR sits on top (like TK Group Central): pick a branch and the list
// filters + re-serial-numbers to that branch; each item is OWNED by a team (Accounts /
// Operations / IT & Admin / HR) so it reads as an owned to-do, not just a category.

const KPI_COLOR = { pending: '#1a1c22', error: '#b23b3b', warn: '#a86a10', branches: '#1a1c22' };

function issueColumns(setRoute) {
  return [
    { key: 'sr', header: 'SR', align: 'right', render: (r) => (
      <span className="tabular-nums text-[12px] font-semibold text-ink-subtle">{r.sr}</span>
    ) },
    { key: 'branch', header: 'Branch', render: (r) => (
      <Badge tone={r.scope === 'central' ? 'neutral' : 'info'} size="sm">{r.branch}</Badge>
    ) },
    { key: 'label', header: 'Function / Module', render: (r) => (
      <div>
        <div className="font-medium text-ink">{r.label}</div>
        <div className="text-[11px] text-ink-subtle">{r.category}</div>
      </div>
    ) },
    { key: 'owner', header: 'Owner', render: (r) => (
      <Badge tone={ownerTone(r.owner)} size="sm">{r.owner || '—'}</Badge>
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
  const allRows = readinessRows(d);
  const cats = categoryRows(d);
  const branches = branchRows(d);

  // The in-tab branch bar follows the top TK Group Central selector (cockpit Focus):
  // it starts on the spotlighted branch and re-syncs when the top selector changes, so
  // the whole Tower stays on one branch. Within 'ALL' the bar still lets you drill in.
  const focus = useCockpitFocus();
  const [branch, setBranch] = useState(focus || 'ALL');
  useEffect(() => { setBranch(focus || 'ALL'); }, [focus]);
  // Filter to the chosen branch, then (re)serial-number the visible rows 1..n.
  const rows = (branch === 'ALL' ? allRows : allRows.filter((r) => r.branch === branch)).map((r, i) => ({ ...r, sr: i + 1 }));
  const cur = branches.find((b) => b.branch === branch);

  // Placed after the hooks above (useState) to keep hook order stable. A failed
  // roll-up must not read as an honest "nothing pending / all set up".
  if (q.isError) return <BandError label="setup readiness" onRetry={q.refetch} />;

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-readiness-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={(k.key === 'error' && Number(k.value) > 0) || (k.key === 'warn' && Number(k.value) > 0) ? KPI_COLOR[k.key] : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      {/* Branch separator — pick a branch to scope the list (TK Group style). */}
      {branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="tk-readiness-branchbar">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Branch</span>
          <button type="button" onClick={() => setBranch('ALL')}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${branch === 'ALL' ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
            All <span className="tabular-nums opacity-80">{allRows.length}</span>
          </button>
          {branches.map((b) => (
            <button key={b.branch} type="button" onClick={() => setBranch(b.branch)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${branch === b.branch ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
              {b.branch} <span className="tabular-nums opacity-80">{b.pending}</span>
            </button>
          ))}
          {cur && (
            <span className="ml-1 text-[11px] text-ink-subtle">
              <b className="tabular-nums text-ink-muted">{cur.live}</b> / {cur.total} modules live
            </span>
          )}
        </div>
      )}

      <PageSection title="How readiness is tracked">
        <p className="text-xs text-ink-muted">
          Each module is checked against its live setup milestones (masters created? · limits/terms set? · has data this year?).
          A module is listed here until every milestone is met, then it drops off automatically — nothing is hand-ticked.
          <b> Not started</b> = no data entered yet · <b>In progress</b> = partly configured · <b>Awaiting setup</b> = feature needs enabling.
          Each item is owned by <b>Accounts</b>, <b>Operations</b>, <b>IT &amp; Admin</b> or <b>HR</b>.
        </p>
      </PageSection>

      <DataTable
        title={`Pending setup — modules awaiting data entry / configuration${branch === 'ALL' ? '' : ` · ${branch}`}`}
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
