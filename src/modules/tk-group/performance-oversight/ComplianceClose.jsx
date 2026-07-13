import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchCockpit } from '../api/monitor';
import { useCockpitFocus } from '../../../store/cockpitFocus';
import { isFocused } from '../utils/cockpitFocus';
import { Badge } from '../../../shell/primitives';
import { DataTable } from '../../../shell/DataTable';
import { useReconSummary, useReconPending } from '../../../core/useReconciliation';

// ─── TK GROUP CENTRAL · Compliance & Close ───────────────────────────────────
// Per-branch close & compliance posture — is the branch locked, does it have pending
// governance/decisions to clear, and is its reconciliation ladder up to date. Branchwise;
// every branch stands on its own. Reuses the monitor endpoint (period locks + pending
// change-requests) and the reconciliation summary/pending boards.
const COMPLIANCE_COLS = [
  { key: 'branch', header: 'Branch', className: 'font-bold' },
  {
    key: 'periodLock', header: 'Period lock', sortable: false,
    render: (r) => {
      const locks = r.lockedPeriods || [];
      return locks.length > 0
        ? <Badge tone="info" size="sm">{`Locked · ${locks[0]}`}</Badge>
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

// ── Reconciliation readiness (branchwise) ────────────────────────────────────
// So the Owner/Director see, at a glance, which branch is behind on the certificate
// ladder — same colour language as the Reconciliation Queue and the bell.
const tierCount = (g = {}) => ({ total: g.total || 0, done: g.done || 0 });
const doneBadge = (t, okNeutral) =>
  t.total && t.done >= t.total
    ? <Badge tone="success" size="sm">{`${t.done}/${t.total}`}</Badge>
    : <Badge tone={okNeutral ? 'neutral' : 'warning'} size="sm">{`${t.done}/${t.total}`}</Badge>;

const RECO_READY_COLS = [
  { key: 'branch', header: 'Branch', className: 'font-bold' },
  { key: 'weekly', header: 'Weekly (this week)', sortable: false, render: (r) => doneBadge(r.wk, false) },
  { key: 'month', header: 'Month-End', sortable: false, render: (r) => doneBadge(r.mo, true) },
  { key: 'overdue', header: 'Overdue', num: true, render: (r) => r.overdue > 0 ? <Badge tone="danger" size="sm">{r.overdue}</Badge> : <Badge tone="neutral" size="sm">0</Badge> },
  {
    key: 'status', header: 'Status', sortable: false,
    render: (r) => {
      const clear = r.overdue === 0 && (!r.wk.total || r.wk.done >= r.wk.total);
      if (clear) return <Badge tone="success" size="sm">Clear</Badge>;
      const label = r.overdue > 0 ? `${r.overdue} overdue` : `${Math.max(0, r.wk.total - r.wk.done)} to reconcile`;
      return <Badge tone={r.overdue > 0 ? 'danger' : 'warning'} size="sm">{label}</Badge>;
    },
  },
];

function ReconReadiness({ focus }) {
  const s = useReconSummary(undefined); // group view → byBranch (all branches)
  const p = useReconPending(undefined);
  const today = new Date().toISOString().slice(0, 10);
  const byBranchS = (s.data && s.data.byBranch) || [];
  const pendById = new Map(((p.data && p.data.byBranch) || []).map((b) => [b.branch, b.rows || []]));
  let rows = byBranchS.map((b) => {
    const prows = pendById.get(b.branch) || [];
    const overdue = prows.filter((r) => r.tier === 'weekly' && !r.upcoming && r.state !== 'closed' && r.dueOn && r.dueOn < today).length;
    return { branch: b.branch, wk: tierCount(b.tiers && b.tiers.weekly), mo: tierCount(b.tiers && b.tiers.month), overdue };
  });
  if (isFocused(focus)) rows = rows.filter((r) => r.branch === focus);
  return (
    <div className="mt-5" data-testid="tk-reco-readiness">
      <p className="mb-2.5 text-[11.5px] text-ink-muted"><b>Reconciliation readiness</b> — each branch's certificate ladder: how many bank/BS ledgers are reconciled this week and month, and how many weekly cycles are past their Friday.</p>
      <DataTable
        columns={RECO_READY_COLS}
        rows={rows}
        getRowKey={(r) => r.branch}
        loading={s.isLoading || p.isLoading}
        isError={s.isError || p.isError}
        emptyMessage="No reconciliation data."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}

export function ComplianceClose() {
  const focus = useCockpitFocus();
  const q = useQuery({ queryKey: ['tk', 'monitor', 'branches'], queryFn: getBranchCockpit, staleTime: 30_000, refetchInterval: 60_000 });
  const all = (q.data && q.data.items) || [];
  const rows = isFocused(focus) ? all.filter((r) => r.branch === focus) : all;

  return (
    <div>
      <p className="mb-2.5 text-[11.5px] text-ink-muted">
        {isFocused(focus) ? <b>{focus} — focused</b> : <b>Branchwise</b>} — each branch's close & compliance posture, on its own.
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

      <ReconReadiness focus={focus} />
    </div>
  );
}
