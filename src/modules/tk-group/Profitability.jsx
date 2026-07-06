import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { fyRange } from './utils/scorecard';
import { profitabilityRow } from './utils/profitability';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Profitability (branchwise) ───────────────────────────
// Each branch's P&L — Revenue, Cost, Gross Profit, GP%, Expenses, Net Profit, NP% —
// in its OWN currency. Never consolidated into a group total.
//
// Built from the shared design system (DataTable + design tokens) so it matches the
// branch dashboards — no bespoke tables/inline hex.
const gpTone = (pct) => (pct >= 15 ? 'text-success' : pct < 10 ? 'text-danger' : 'text-warning');

const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'rev', header: 'Revenue', align: 'right', num: true, render: (r) => money(r.rev, r.cur) },
  { key: 'cost', header: 'Cost', align: 'right', num: true, render: (r) => money(r.cost, r.cur) },
  { key: 'gp', header: 'Gross Profit', align: 'right', num: true, render: (r) => money(r.gp, r.cur) },
  { key: 'gpPct', header: 'GP %', align: 'right', num: true, render: (r) => <span className={`${gpTone(r.gpPct)} tabular-nums`}>{r.gpPct}%</span> },
  { key: 'exp', header: 'Expenses', align: 'right', num: true, render: (r) => money(r.exp, r.cur) },
  { key: 'np', header: 'Net Profit', align: 'right', num: true, render: (r) => <span className={`${r.np < 0 ? 'text-danger' : 'text-ink'} font-bold tabular-nums`}>{money(r.np, r.cur)}</span> },
  { key: 'npPct', header: 'NP %', align: 'right', num: true, render: (r) => <span className={`${r.npPct < 0 ? 'text-danger' : 'text-success'} tabular-nums`}>{r.npPct}%</span> },
];

export function Profitability() {
  const { from, to } = fyRange(new Date());
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'pl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => profitabilityRow(b, q[i] && q[i].data));

  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-muted">FY {from} → {to} · <b>branchwise</b> — each branch in its own currency, never consolidated.</p>
      <div data-testid="tk-profitability">
        <DataTable
          title="Profitability"
          columns={COLS}
          rows={rows}
          getRowKey={(r) => r.code}
          emptyMessage="No branch figures yet."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">Branchwise — never consolidated. Branches are equal peers, compared side by side.</p>
    </div>
  );
}
