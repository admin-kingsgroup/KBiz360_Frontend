import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { arapRow } from './utils/arap';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Receivables & Payables (branchwise) ──────────────────
// Each branch's outstanding — receivables (with 90d+), payables and the net — in its
// OWN currency. Never consolidated into a group total.
//
// Built from the shared design system (DataTable + design tokens) so it matches the
// branch dashboards — no bespoke tables/inline hex.
const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'receivables', header: 'Receivables', align: 'right', num: true, render: (r) => money(r.receivables, r.cur) },
  { key: 'over90', header: '90d+ overdue', align: 'right', num: true, render: (r) => <span className={`${r.over90 > 0 ? 'text-danger' : 'text-ink-muted'} tabular-nums`}>{money(r.over90, r.cur)}</span> },
  { key: 'payables', header: 'Payables', align: 'right', num: true, render: (r) => money(r.payables, r.cur) },
  { key: 'net', header: 'Net', align: 'right', num: true, render: (r) => <span className={`${r.net < 0 ? 'text-danger' : 'text-ink'} font-bold tabular-nums`}>{money(r.net, r.cur)}</span> },
  { key: 'debtors', header: 'Debtors / Creditors', align: 'right', num: true, sortable: false, render: (r) => <span className="text-ink-muted tabular-nums">{r.debtors} / {r.creditors}</span> },
];

export function ReceivablesPayables() {
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'arap', b.code], queryFn: () => apiGet('/api/accounting/ageing', { branch: b.code }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => arapRow(b, q[i] && q[i].data));

  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-muted"><b>Branchwise</b> — each branch's outstanding in its own currency, never consolidated.</p>
      <div data-testid="tk-arap">
        <DataTable
          title="Receivables & Payables"
          columns={COLS}
          rows={rows}
          getRowKey={(r) => r.code}
          emptyMessage="No outstanding balances."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">Branchwise — never consolidated. Net = receivables − payables, per branch.</p>
    </div>
  );
}
