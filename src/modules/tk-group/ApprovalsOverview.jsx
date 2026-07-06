import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { aggregateApprovals, stageFunnel, STAGE_LABELS, STAGE_ORDER } from './utils/approvalPipeline';

// ─── TK GROUP CENTRAL · Approvals overview (branchwise) ──────────────────────
// The "one central queue across all branches" summary: how many vouchers are Pending
// per branch and the backlog value in each branch's own currency. Read-only oversight
// over the SAME per-branch counts the branch approval screen returns — respects Focus
// (all branches, or one). Amounts are summed only within a currency, never blended.
//
// The per-stage pipeline (Sughra verify → Faiz approve → Owner co-sign, "pending under
// whom") arrives with the approval verify sub-state; this is the branch-level backlog
// view that stands on today's data.
const curSym = (b) => b.cur || ((b.currency === 'USD' || b.curCode === 'USD') ? '$' : '₹');

const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'pendingN', header: 'Pending', align: 'right', num: true, render: (r) => <span className={`${r.pending.n > 0 ? 'font-bold text-warning' : 'text-ink-muted'} tabular-nums`}>{r.pending.n}</span> },
  { key: 'pendingAmt', header: 'Pending value', align: 'right', num: true, render: (r) => money(r.pending.amount, r.cur) },
  { key: 'approvedN', header: 'Approved', align: 'right', num: true, render: (r) => <span className="text-ink-muted tabular-nums">{r.approved.n}</span> },
];

export function ApprovalsOverview() {
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const q = useQueries({
    queries: view.map((b) => ({
      queryKey: ['tk', 'appr-overview', b.code],
      queryFn: () => apiGet('/api/vouchers/approvals', { branch: b.code, status: 'pending' }),
      staleTime: 30_000,
    })),
  });
  const perBranch = view.map((b, i) => ({
    code: b.code, flag: b.flag, cur: curSym(b),
    counts: (q[i] && q[i].data && q[i].data.counts) || {},
  }));
  const agg = aggregateApprovals(perBranch);
  // aggregate keeps code+cur; graft the flag back (same order as view, no sort).
  const rows = agg.byBranch.map((r, i) => ({ ...r, flag: perBranch[i] && perBranch[i].flag }));
  const curLine = Object.entries(agg.pendingByCurrency).map(([c, a]) => money(a, c)).join(' · ') || '—';
  // Pipeline funnel from the REAL per-voucher stage (Check → Verify · Sughra → Approve
  // · Faiz), pooled across the focused branches — "pending under whom".
  const allEntries = view.flatMap((b, i) => ((q[i] && q[i].data && q[i].data.entries) || []));
  const funnel = stageFunnel(allEntries);

  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-muted">
        {isFocused(focus) ? <b>{focus} — focused</b> : <b>Branchwise</b>} · <b>{agg.totals.pendingN}</b> pending {agg.totals.pendingN === 1 ? 'voucher' : 'vouchers'} · {curLine} — amounts never summed across currencies.
      </p>
      {/* Pipeline funnel — where the pending vouchers sit (real reviewStage). */}
      <div data-testid="tk-approvals-funnel" className="flex flex-wrap gap-2">
        {STAGE_ORDER.map((k) => (
          <div key={k} className="min-w-[150px] flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-subtle">{STAGE_LABELS[k]}</div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${funnel[k] > 0 && k !== 'direct' ? 'text-warning' : 'text-ink'}`}>{funnel[k]}</div>
          </div>
        ))}
      </div>
      <div data-testid="tk-approvals-overview">
        <DataTable
          title="Pending approvals — by branch"
          columns={COLS}
          rows={rows}
          getRowKey={(r) => r.code}
          emptyMessage="Nothing pending."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">One central queue across all branches (Model B). The per-stage pipeline — Sughra verify → Faiz approve → Owner co-sign — arrives with the approval verify sub-state.</p>
    </div>
  );
}

export default ApprovalsOverview;
