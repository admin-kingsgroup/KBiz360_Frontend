import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFlagState } from './api/flags';
import { readinessFromFlags } from './utils/readiness';
import { Badge } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP CENTRAL · Configuration Readiness ──────────────────────────────
// A read-only scoreboard: how much of the control layer is engaged (green %), the
// master-guard status, and each control's on/off state — from the live flag state.
// The number Faiz & the Owner watch climb to 100% as go-live completes. Complements
// (does not duplicate) the Go-Live activation checklist.
const COLS = [
  { key: 'label', header: 'Control', align: 'left', className: 'font-semibold', render: (r) => r.label },
  { key: 'key', header: 'Flag', align: 'left', sortable: false, render: (r) => <span className="font-mono text-[11px] text-ink-muted">{r.key}</span> },
  {
    key: 'on', header: 'Status', align: 'left', sortable: false,
    render: (r) => (r.on
      ? <Badge tone="success" size="sm">{r.foundation ? 'Foundation' : 'Engaged'}</Badge>
      : <Badge tone="neutral" size="sm">Dormant</Badge>),
  },
];

export function ConfigReadiness() {
  const q = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  const r = readinessFromFlags(q.data);
  const tone = r.pct >= 100 ? 'text-success' : r.pct >= 50 ? 'text-warning' : 'text-danger';

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink-subtle">Controls engaged</div>
          <div className={`text-3xl font-black tabular-nums ${tone}`}>{r.pct}%</div>
          <div className="text-xs text-ink-muted">{r.engaged} of {r.total} controls on</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink-subtle">Master guard</div>
          <div className="mt-1">
            {r.masterOn
              ? <Badge tone="success">Live · enforcing</Badge>
              : <Badge tone="warning">Dormant · migration-safe</Badge>}
          </div>
        </div>
      </div>
      <div data-testid="tk-config-readiness">
        <DataTable
          title="Control configuration"
          columns={COLS}
          rows={r.items}
          getRowKey={(x) => x.key}
          loading={q.isLoading}
          isError={q.isError}
          emptyMessage="No controls registered yet."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">Read-only. Green % = share of control flags engaged. Controls are flipped on Control Flags (Owner-approved); this scoreboard climbs to 100% as go-live completes — nothing here enforces on its own.</p>
    </div>
  );
}

export default ConfigReadiness;
