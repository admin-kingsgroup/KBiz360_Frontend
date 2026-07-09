import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGroupHealth } from './api/monitor';
import { healthKpis, branchCards, issueRows, domainRows, healthTone, severityTone, healthVerdict, focusView } from './utils/health';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';

// ─── TK GROUP · FE · Group Health (branch-wise alerts, on the Control Tower) ──
// Wires the live per-branch alerts engine into the Control Tower: group health score,
// worst-branch-first cards, the top issues across every branch, and a domain heatmap.
// LIVE (60s stale / 5-min refetch) so fixing an issue clears it on the next refresh.
// Branchwise, never blended. Read-only; dormant-safe (no data → healthy, empty).

const TONE_COLOR = { good: '#1a7a4c', warn: '#a86a10', poor: '#b4531a', critical: '#b23b3b' };

function issueColumns(setRoute) {
  return [
    { key: 'branch', header: 'Branch', render: (r) => <b className="text-ink">{r.branch}</b> },
    { key: 'severity', header: 'Severity', align: 'center', render: (r) => (
      <Badge tone={severityTone(r.severity)} size="sm">{r.severity === 'error' ? 'critical' : r.severity}</Badge>
    ) },
    { key: 'title', header: 'Issue', render: (r) => (
      <div><div className="font-medium text-ink">{r.title}</div><div className="text-[11px] text-ink-muted">{r.detail}</div></div>
    ) },
    { key: 'link', header: '', align: 'right', render: (r) => (r.link
      ? <button type="button" onClick={() => (setRoute ? setRoute(r.link) : (window.location.href = r.link))} className="text-[12px] font-medium text-info hover:underline">Open →</button>
      : null) },
  ];
}

export function GroupHealth({ setRoute } = {}) {
  const focus = useCockpitFocus();
  const q = useQuery({ queryKey: ['tk', 'monitor', 'health'], queryFn: getGroupHealth, staleTime: 60_000, refetchInterval: 300_000 });
  const d = focusView(q.data || {}, focus); // narrow to the spotlighted branch (ALL = group)
  const scoped = focus && focus !== 'ALL';
  const kpis = healthKpis(d, focus);
  const cards = branchCards(d);
  const issues = issueRows(d);
  const domains = domainRows(d);

  // A failed roll-up must not read as "score 100 / all healthy".
  if (q.isError) return <BandError label="group health" onRetry={q.refetch} />;

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-health-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={k.key === 'errors' && Number(k.value) > 0 ? TONE_COLOR.critical : k.key === 'score' ? TONE_COLOR[healthTone(Number(k.value))] : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      <PageSection title={scoped ? 'Branch health' : 'Branch health — worst first'}>
        <ResponsiveGrid min="150px" gap="md">
          {cards.length ? cards.map((c) => (
            <div key={c.branch} className="rounded-lg border border-surface-border bg-surface p-3" style={{ borderLeft: `4px solid ${TONE_COLOR[c.tone]}` }}>
              <div className="flex items-baseline justify-between">
                <b className="text-ink">{c.branch}</b>
                <span className="tabular-nums text-lg font-extrabold" style={{ color: TONE_COLOR[c.tone] }}>{c.score}</span>
              </div>
              <div className="mt-1 flex gap-1.5 text-[11px]">
                {c.errors > 0 && <Badge tone="danger" size="sm">{c.errors} critical</Badge>}
                {c.warn > 0 && <Badge tone="warning" size="sm">{c.warn} warn</Badge>}
                {c.errors === 0 && c.warn === 0 && <Badge tone="success" size="sm">{healthVerdict(c.score)}</Badge>}
              </div>
              {c.lead && <div className="mt-1.5 text-[11px] text-ink-muted truncate" title={c.lead.title}>↳ {c.lead.title}</div>}
            </div>
          )) : <p className="text-xs text-ink-subtle">All branches healthy.</p>}
        </ResponsiveGrid>
      </PageSection>

      <DataTable
        title={scoped ? `Top issues — ${focus}` : 'Top issues across all branches'}
        columns={issueColumns(setRoute)}
        rows={issues}
        getRowKey={(r, i) => `${r.branch}:${r.type}:${i}`}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="No open issues — all branches clean."
        searchable
        showDensityToggle={false}
        zebra
      />

      {domains.length > 0 && (
        <PageSection title={scoped ? 'By area' : 'By area (branches affected)'}>
          <div className="grid gap-1.5">
            {domains.map((dm) => (
              <div key={dm.key} className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">{dm.label}</span>
                <span className="flex items-center gap-1.5">
                  {dm.error > 0 && <Badge tone="danger" size="sm">{dm.error}</Badge>}
                  {dm.warn > 0 && <Badge tone="warning" size="sm">{dm.warn}</Badge>}
                  <span className="text-ink-subtle">{dm.branches.join(', ')}</span>
                </span>
              </div>
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}
