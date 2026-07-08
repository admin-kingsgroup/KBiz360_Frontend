import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { assetBranchRow } from './utils/assets';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Assets (branchwise) ──────────────────────────────────
// Each branch's fixed-asset register in its OWN currency — asset count, gross cost,
// accumulated depreciation and net book value. Never consolidated into a group total.
// Reuses /api/fixed-assets. Built from the shared design system (DataTable + tokens).
const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'count', header: 'Assets', align: 'right', num: true, render: (r) => r.count },
  { key: 'gross', header: 'Gross (Cost)', align: 'right', num: true, render: (r) => money(r.gross, r.cur) },
  { key: 'depreciation', header: 'Accum. Depreciation', align: 'right', num: true, render: (r) => money(r.depreciation, r.cur) },
  { key: 'nbv', header: 'Net Book Value', align: 'right', num: true, render: (r) => <span className="font-semibold tabular-nums">{money(r.nbv, r.cur)}</span> },
  { key: 'disposed', header: 'Disposed', align: 'right', num: true, render: (r) => r.disposed || 0 },
];

export function AssetsCentral() {
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const q = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'assets', b.code], queryFn: () => apiGet('/api/fixed-assets', { branch: b.code }), staleTime: 60_000 })) });
  const rows = view.map((b, i) => assetBranchRow(b, q[i] && q[i].data));

  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-muted">
        {isFocused(focus) ? <b>{focus} — focused</b> : <b>branchwise</b>} — each branch's fixed-asset register in its own currency, never consolidated.
      </p>
      <div data-testid="tk-assets">
        <DataTable
          title="Fixed-Asset Register"
          columns={COLS}
          rows={rows}
          isError={q.length > 0 && q.every((x) => x.isError)}
          getRowKey={(r) => r.code}
          emptyMessage="No fixed assets yet."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">Branchwise — never consolidated. Capex is money-out: a new asset raised in a branch routes through the master gate for the Owner's approval once the guard is engaged.</p>
    </div>
  );
}
