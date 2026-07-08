import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { fyRange } from './utils/scorecard';
import { perfTargetRow, PERF_METRICS, fyStr } from './utils/perfTarget';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { Select } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Performance vs Target (branchwise) ────────────────────
// Each branch's target vs actual for the chosen metric, in its OWN currency — never
// consolidated. Reuses /api/accounting/targets-vs-actual per branch.
//
// Built from the shared design system (Select + DataTable + design tokens) so it
// matches the branch dashboards — no bespoke tables/inline hex.
const achTone = (a) => (a >= 100 ? 'text-success' : a >= 90 ? 'text-warning' : 'text-danger');

const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'target', header: 'Target', align: 'right', num: true, render: (r) => money(r.target, r.cur) },
  { key: 'actual', header: 'Actual', align: 'right', num: true, render: (r) => money(r.actual, r.cur) },
  { key: 'achievement', header: 'Achievement', align: 'right', num: true, render: (r) => r.target ? <span className={`${achTone(r.achievement)} font-bold tabular-nums`}>{r.achievement}%</span> : '—' },
  { key: 'variance', header: 'Variance', align: 'right', num: true, render: (r) => <span className={`${r.variance < 0 ? 'text-danger' : 'text-success'} tabular-nums`}>{money(r.variance, r.cur)}</span> },
];

export function PerformanceTargets() {
  const [metric, setMetric] = useState('sales');
  const { from, to } = fyRange(new Date());
  const fy = fyStr(new Date());
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const q = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'pvt', metric, b.code, fy], queryFn: () => apiGet('/api/accounting/targets-vs-actual', { branch: b.code, metric, from, to, fy }), staleTime: 60_000 })) });
  const rows = view.map((b, i) => perfTargetRow(b, q[i] && q[i].data));
  const noTargets = rows.every((r) => r.target === 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="text-xs font-bold text-ink-muted">Metric</label>
        <Select aria-label="Metric" value={metric} onChange={(e) => setMetric(e.target.value)} className="w-auto">
          {PERF_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </Select>
        <span className="text-xs text-ink-muted">FY {fy} · {isFocused(focus) ? <b>{focus} — focused</b> : <b>branchwise</b>}</span>
      </div>
      <div data-testid="tk-perf-target">
        <DataTable
          title="Performance vs Target"
          columns={COLS}
          rows={rows}
          loading={q.some((x) => x.isLoading)}
          isError={q.length > 0 && q.every((x) => x.isError)}
          getRowKey={(r) => r.code}
          emptyMessage="No branches to compare."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      {noTargets ? <p className="text-xs text-warning">No targets set for this metric — set them in TK Group Central ▸ Controls ▸ Targets &amp; Budgets.</p> : null}
      <p className="text-xs text-ink-subtle">Branchwise — each branch vs its own target, never consolidated.</p>
    </div>
  );
}
