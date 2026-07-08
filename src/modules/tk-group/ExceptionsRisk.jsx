import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { scorecardRow, fyRange } from './utils/scorecard';
import { branchExceptions, riskScore } from './utils/exceptions';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { Badge } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Exceptions & Risk ────────────────────────────────────
// Branchwise governance red-flags — each branch assessed on its own figures (net
// loss, thin margin, no bookings). Not consolidated; the worst-off branches surface
// first so the Owner sees what needs attention.
//
// Built from the shared design system (Badge + DataTable + design tokens) so it
// matches the branch dashboards — no bespoke tables/inline hex.
const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'np', header: 'Net Profit', align: 'right', num: true, render: (r) => <span className={`${r.np < 0 ? 'text-danger' : 'text-ink'} tabular-nums`}>{money(r.np, r.cur)}</span> },
  { key: 'gpPct', header: 'GP %', align: 'right', num: true, render: (r) => `${r.gpPct}%` },
  {
    key: 'flags', header: 'Flags', align: 'left', sortable: false,
    render: (r) => (
      r.flags.length
        ? <span className="flex flex-wrap gap-1">{r.flags.map((f, i) => <Badge key={i} tone={f.sev === 'high' ? 'danger' : 'warning'} size="sm">{f.label}</Badge>)}</span>
        : <span className="text-xs text-success">✓ clear</span>
    ),
  },
];

export function ExceptionsRisk() {
  const { from, to } = fyRange(new Date());
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const pnl = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'ex', 'pnl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const inv = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'ex', 'inv', b.code, from, to], queryFn: () => apiGet('/api/accounting/invoice-gp', { branch: b.code, from, to }), staleTime: 60_000 })) });

  const rows = view.map((b, i) => {
    const sc = scorecardRow(b, pnl[i] && pnl[i].data, inv[i] && inv[i].data);
    const flags = branchExceptions(sc);
    return { ...sc, flags, score: riskScore(flags) };
  }).sort((a, b) => b.score - a.score);
  const clean = rows.every((r) => !r.flags.length);

  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-muted">
        FY {from} → {to} · {isFocused(focus) ? <b>{focus} — focused</b> : <b>branchwise</b>} — each branch judged on its own figures, worst first.
      </p>
      <div data-testid="tk-exceptions">
        <DataTable
          title="Exceptions & Risk"
          columns={COLS}
          rows={rows}
          isError={pnl.length > 0 && pnl.every((x) => x.isError) && inv.every((x) => x.isError)}
          getRowKey={(r) => r.code}
          emptyMessage="No branches to assess."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      {clean ? <p className="text-xs text-success">No exceptions across the branches.</p> : null}
      <p className="text-xs text-ink-subtle">Branchwise — never consolidated. Thresholds: net loss (high), GP% under 10% or no bookings (watch).</p>
    </div>
  );
}
