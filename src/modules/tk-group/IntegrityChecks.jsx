import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIntegrity } from './api/monitor';
import { integrityKpis, branchCards, matrixRows, branchKeys, findingRows, statusTone, statusGlyph } from './utils/integrity';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Close-Readiness & Integrity (SAP-style checklist) ───────
// A branch-wise financial-close cockpit: accounting-integrity + governance gates that
// a period must pass before lock (journal drift, orphan journals, self-approvals, dup
// numbers/masters, suspense, sub-ledger↔GL, FX revaluation, depreciation, accruals,
// GSTR-2B). LIVE — a fix clears the gate on refresh. Read-only; dormant-safe.

const TONE_COLOR = { pass: '#1a7a4c', fail: '#b23b3b', warn: '#a86a10', na: '#7a8090' };

function Cell({ status }) {
  return (
    <span title={status} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold"
      style={{ color: TONE_COLOR[status], background: `${TONE_COLOR[status]}1a` }}>{statusGlyph(status)}</span>
  );
}

const FINDING_COLS = [
  { key: 'branch', header: 'Branch', render: (r) => <b className="text-ink">{r.branch}</b> },
  { key: 'status', header: 'Gate', align: 'center', render: (r) => <Badge tone={statusTone(r.status)} size="sm">{r.status === 'fail' ? 'blocks close' : 'review'}</Badge> },
  { key: 'label', header: 'Check', render: (r) => (
    <div><div className="font-medium text-ink">{r.label}</div><div className="text-[11px] text-ink-muted">{r.detail}{r.sample && r.sample.length ? ` · e.g. ${r.sample.slice(0, 2).join(', ')}` : ''}</div></div>
  ) },
  { key: 'count', header: 'Count', align: 'right', num: true, render: (r) => <span className="tabular-nums font-semibold">{r.count}</span> },
];

export function IntegrityChecks() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'integrity'], queryFn: getIntegrity, staleTime: 60_000, refetchInterval: 300_000 });
  const d = q.data || {};
  const kpis = integrityKpis(d);
  const cards = branchCards(d);
  const branches = branchKeys(d);
  const rows = matrixRows(d);
  const findings = findingRows(d);

  const matrixCols = [
    { key: 'label', header: 'Integrity / Close gate', render: (r) => (
      <div><div className="font-medium text-ink">{r.label}</div><div className="text-[11px] text-ink-subtle">{r.category}</div></div>
    ) },
    ...branches.map((b) => ({ key: b, header: b, align: 'center', render: (r) => <Cell status={r.byBranch[b] || 'na'} /> })),
  ];

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-integrity-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={k.key === 'fails' && Number(k.value) > 0 ? TONE_COLOR.fail : k.key === 'score' ? TONE_COLOR.pass : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      <PageSection title="Branch close-readiness — worst first">
        <ResponsiveGrid min="150px" gap="md">
          {cards.length ? cards.map((c) => (
            <div key={c.branch} className="rounded-lg border border-surface-border bg-surface p-3"
              style={{ borderLeft: `4px solid ${c.closeReady ? TONE_COLOR.pass : TONE_COLOR.fail}` }}>
              <div className="flex items-baseline justify-between">
                <b className="text-ink">{c.branch}</b>
                <span className="tabular-nums text-lg font-extrabold" style={{ color: c.closeReady ? TONE_COLOR.pass : TONE_COLOR.fail }}>{c.score}</span>
              </div>
              <div className="mt-1 flex gap-1.5 text-[11px]">
                {c.closeReady
                  ? <Badge tone="success" size="sm">Ready to close</Badge>
                  : <Badge tone="danger" size="sm">{c.fails} gate(s) failing</Badge>}
                {c.warns > 0 && <Badge tone="warning" size="sm">{c.warns} warn</Badge>}
              </div>
            </div>
          )) : <p className="text-xs text-ink-subtle">All branches close-ready.</p>}
        </ResponsiveGrid>
      </PageSection>

      <DataTable
        title="Integrity & close checklist — gate × branch"
        columns={matrixCols}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="No checks configured."
        searchable
        showDensityToggle={false}
        zebra
        stickyHeader
      />

      <DataTable
        title="Findings — what blocks the close"
        columns={FINDING_COLS}
        rows={findings}
        getRowKey={(r, i) => `${r.branch}:${r.label}:${i}`}
        loading={q.isLoading}
        emptyMessage="No open findings — every branch is clean."
        searchable
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
