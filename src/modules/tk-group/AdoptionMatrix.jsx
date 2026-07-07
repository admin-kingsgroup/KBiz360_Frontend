import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdoption } from './api/monitor';
import { adoptionKpis, adoptionTone, badgeTone, branchKeys, matrixRows, cellFor, centralCell, adoptionVerdict } from './utils/adoption';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · ERP Adoption (branch × function matrix) ─────────────────
// The "how much of the ERP is each branch actually using?" board. LIVE: it hits
// /adoption on every load (60s stale, 5-min refetch) so the moment data is entered or
// an issue is fixed, the score moves. Branchwise — never blended — with a Central
// column for shared config. Read-only; dormant-safe (no data → honest zeros).
// Built from the shared design system (KpiTile · PageSection · Badge · DataTable).

const TONE_COLOR = { live: '#1a7a4c', partial: '#a86a10', dormant: '#7a8090', na: '#7a8090' };

function pctColor(pct) {
  return TONE_COLOR[adoptionTone(pct == null ? null : pct)] || '#1a1c22';
}

/** A percentage cell — a coloured badge, or an em-dash when not applicable. */
function Cell({ pct, tone }) {
  if (pct == null) return <span className="text-ink-subtle">—</span>;
  return <Badge tone={badgeTone(tone)} size="sm">{pct}%</Badge>;
}

export function AdoptionMatrix() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'adoption'], queryFn: getAdoption, staleTime: 60_000, refetchInterval: 300_000 });
  const d = q.data || {};
  const kpis = adoptionKpis(d);
  const central = d.central || {};
  const branches = branchKeys(d);
  const rows = matrixRows(d);

  const columns = [
    { key: 'label', header: 'ERP Function', render: (r) => (
      <div>
        <div className="font-medium text-ink">{r.label}</div>
        <div className="text-[11px] text-ink-subtle">{r.category}{r.scope === 'central' ? ' · central' : ''}</div>
      </div>
    ) },
    ...branches.map((b) => ({
      key: b, header: b, align: 'center',
      render: (r) => <Cell {...cellFor(r, b)} />,
    })),
    { key: 'central', header: 'Central', align: 'center', render: (r) => <Cell {...centralCell(r)} /> },
  ];

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="140px" gap="md" data-testid="tk-adoption-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.verdict} color={pctColor(parseInt(k.value, 10))} />
        ))}
        <KpiTile label="Central config" value={`${central.adoption || 0}%`} sub={adoptionVerdict(central.adoption || 0)} color={pctColor(central.adoption || 0)} />
      </ResponsiveGrid>

      <PageSection title="How adoption is scored">
        <p className="text-xs text-ink-muted">
          Each function is scored by capability milestones (configured? · has data? · active this year?) — adoption% = milestones met ÷ total.
          It is <b>live</b>: numbers move as branches enter data or fix issues. <b>Green</b> = live · <b>amber</b> = partial · <b>grey</b> = not yet used.
          Scores are branchwise and never blended; the <b>Central</b> column holds shared config (numbering, masters, approvals).
        </p>
      </PageSection>

      <DataTable
        title="Branch × function adoption"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.module}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="No adoption data yet."
        searchable
        showDensityToggle={false}
        zebra
        stickyHeader
      />
    </div>
  );
}
