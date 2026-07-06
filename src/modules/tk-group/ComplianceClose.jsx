import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchCockpit } from './api/monitor';
import { Badge } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP CENTRAL · Compliance & Close ───────────────────────────────────
// Per-branch close & compliance posture — is the branch locked, does it have pending
// governance/decisions to clear. Branchwise; every branch stands on its own. Reuses
// the monitor endpoint (period locks + pending change-requests per branch).
const COMPLIANCE_COLS = [
  { key: 'branch', header: 'Branch', className: 'font-bold' },
  {
    key: 'periodLock', header: 'Period lock', sortable: false,
    render: (r) => {
      const locks = r.lockedPeriods || [];
      return locks.length > 0
        ? <Badge tone="success" size="sm">{`Locked · ${locks[0]}`}</Badge>
        : <Badge tone="neutral" size="sm">Open</Badge>;
    },
  },
  { key: 'pendingDecisions', header: 'Pending decisions', num: true, render: (r) => r.pendingDecisions || 0 },
  { key: 'pendingGovernance', header: 'Pending governance', num: true, render: (r) => r.pendingGovernance || 0 },
  {
    key: 'status', header: 'Status', sortable: false,
    render: (r) => {
      const pending = (r.pendingDecisions || 0) + (r.pendingGovernance || 0);
      return pending === 0
        ? <Badge tone="success" size="sm">Clear</Badge>
        : <Badge tone="warning" size="sm">{`${pending} to clear`}</Badge>;
    },
  },
];

export function ComplianceClose() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'branches'], queryFn: getBranchCockpit, staleTime: 30_000, refetchInterval: 60_000 });
  const rows = (q.data && q.data.items) || [];

  return (
    <div>
      <p className="mb-2.5 text-[11.5px] text-ink-muted">
        <b>Branchwise</b> — each branch's close & compliance posture, on its own.
      </p>
      <div data-testid="tk-compliance">
        <DataTable
          columns={COMPLIANCE_COLS}
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
      <p className="mt-2 text-[11px] text-ink-muted">Branchwise — never consolidated. "Locked" shows the latest hard-locked period; pending items are what the branch still needs cleared.</p>
    </div>
  );
}
