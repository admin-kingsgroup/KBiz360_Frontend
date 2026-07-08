import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { scorecardRow, fyRange } from './utils/scorecard';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';

// ─── TK GROUP CENTRAL · Branch Scorecard ─────────────────────────────────────
// A branchwise performance view — every branch side by side in its OWN currency.
// Amounts are NOT consolidated or blended into a group total; this is oversight of
// each branch on its own terms. Reuses the existing accounting endpoints.
//
// Built from the shared design system (DataTable + design tokens) so it matches the
// branch dashboards — no bespoke tables/inline hex.
const gpTone = (pct) => (pct >= 15 ? 'text-success' : pct < 10 ? 'text-danger' : 'text-warning');

const COLS = [
  {
    key: 'code', header: 'Branch', align: 'left',
    render: (r) => (
      <span className="font-bold">
        {r.flag ? `${r.flag} ` : ''}{r.code}
        {r.city ? <span className="font-normal text-ink-muted"> · {r.city}</span> : null}
      </span>
    ),
  },
  { key: 'sales', header: 'Sales', align: 'right', num: true, render: (r) => money(r.sales, r.cur) },
  { key: 'gp', header: 'Gross Profit', align: 'right', num: true, render: (r) => money(r.gp, r.cur) },
  { key: 'gpPct', header: 'GP %', align: 'right', num: true, render: (r) => <span className={`${gpTone(r.gpPct)} tabular-nums`}>{r.gpPct}%</span> },
  { key: 'np', header: 'Net Profit', align: 'right', num: true, render: (r) => <span className={`${r.np < 0 ? 'text-danger' : 'text-ink'} tabular-nums`}>{money(r.np, r.cur)}</span> },
  { key: 'bookings', header: 'Bookings', align: 'right', num: true, render: (r) => r.bookings },
];

export function BranchScorecard() {
  const { from, to } = fyRange(new Date());
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const pnl = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'sc', 'pnl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const inv = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'sc', 'inv', b.code, from, to], queryFn: () => apiGet('/api/accounting/invoice-gp', { branch: b.code, from, to }), staleTime: 60_000 })) });
  // Rows are the (focused) branch roster — the full set branchwise, or the single
  // focused branch — numbers fill in as each branch's data arrives, so it renders
  // immediately rather than hiding behind a loading skeleton.
  const rows = view.map((b, i) => scorecardRow(b, pnl[i] && pnl[i].data, inv[i] && inv[i].data));

  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-muted">
        FY {from} → {to} · {isFocused(focus) ? <b>{focus} — focused</b> : <b>branchwise</b>} — {isFocused(focus) ? 'this branch, in its own currency.' : 'each branch in its own currency, never consolidated.'}
      </p>
      <div data-testid="tk-scorecard">
        <DataTable
          title="Branch Scorecard"
          columns={COLS}
          rows={rows}
          isError={pnl.length > 0 && pnl.every((x) => x.isError) && inv.every((x) => x.isError)}
          getRowKey={(r) => r.code}
          emptyMessage="No branch figures yet."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">No group total by design — branches are equal peers, compared side by side, not summed.</p>
    </div>
  );
}
