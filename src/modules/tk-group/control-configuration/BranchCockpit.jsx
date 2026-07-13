import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchCockpit } from '../api/monitor';
import { useCockpitFocus } from '../../../store/cockpitFocus';
import { isFocused } from '../utils/cockpitFocus';
import { DataTable } from '../../../shell/DataTable';

// ─── TK GROUP · FE · Branch Cockpit (container) ──────────────────────────────
// Per-branch control posture: pending decisions / governance items and locked
// periods, so you can see at a glance which branch needs attention. Read-only.
const needsAttention = (r) => !!((r.pendingDecisions || 0) + (r.pendingGovernance || 0));

const COCKPIT_COLS = [
  { key: 'branch', header: 'Branch', className: 'font-bold', render: (r) => (
    needsAttention(r)
      ? <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 font-bold text-warning" title="Pending decisions or governance need attention"><span className="h-1.5 w-1.5 rounded-full bg-warning" />{r.branch}</span>
      : <span className="font-bold">{r.branch}</span>
  ) },
  { key: 'pendingDecisions', header: 'Pending decisions', num: true, render: (r) => r.pendingDecisions || 0 },
  { key: 'pendingGovernance', header: 'Pending governance', num: true, render: (r) => r.pendingGovernance || 0 },
  { key: 'lockedPeriods', header: 'Locked periods', render: (r) => ((r.lockedPeriods || []).length ? r.lockedPeriods.join(', ') : '—') },
];

export function BranchCockpit() {
  const focus = useCockpitFocus();
  const q = useQuery({ queryKey: ['tk', 'monitor', 'branches'], queryFn: getBranchCockpit, staleTime: 30_000, refetchInterval: 60_000 });
  const all = (q.data && q.data.items) || [];
  // Focus spotlight → only that branch's posture row (matches ComplianceClose).
  const rows = isFocused(focus) ? all.filter((r) => r.branch === focus) : all;

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
