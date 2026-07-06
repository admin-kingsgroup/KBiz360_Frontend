import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchCockpit } from './api/monitor';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Branch Cockpit (container) ──────────────────────────────
// Per-branch control posture: pending decisions / governance items and locked
// periods, so you can see at a glance which branch needs attention. Read-only.
const attentionCls = (r) =>
  ((r.pendingDecisions || 0) + (r.pendingGovernance || 0)) ? 'bg-warning-soft' : '';

const COCKPIT_COLS = [
  { key: 'branch', header: 'Branch', className: 'font-bold', render: (r) => <span className={attentionCls(r)}>{r.branch}</span> },
  { key: 'pendingDecisions', header: 'Pending decisions', num: true, render: (r) => r.pendingDecisions || 0 },
  { key: 'pendingGovernance', header: 'Pending governance', num: true, render: (r) => r.pendingGovernance || 0 },
  { key: 'lockedPeriods', header: 'Locked periods', render: (r) => ((r.lockedPeriods || []).length ? r.lockedPeriods.join(', ') : '—') },
];

export function BranchCockpit() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'branches'], queryFn: getBranchCockpit, staleTime: 30_000, refetchInterval: 60_000 });
  const rows = (q.data && q.data.items) || [];

  return (
    <div data-testid="tk-cockpit">
      <DataTable
        columns={COCKPIT_COLS}
        rows={rows}
        getRowKey={(r) => r.branch}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="No branch data."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
