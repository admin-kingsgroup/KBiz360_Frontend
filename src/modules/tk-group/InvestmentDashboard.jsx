import React, { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { getLimits } from './api/limits';
import { fyRange } from './utils/scorecard';
import { investmentRow, fixFirstFlags } from './utils/investment';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { PageSection, Input } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Investment / Capital (branchwise) ────────────────────
// Each branch's capital & investment in its OWN currency — capital invested,
// investments made, director/partner loans, capital employed and profit. Never
// consolidated into a group total. Reuses /api/accounting/capital-analysis.
//
// Built from the shared design system (PageSection · Input · DataTable + design
// tokens) so it matches the branch dashboards — no bespoke tables/inline hex.
const COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.flag ? `${r.flag} ` : ''}{r.code}</span> },
  { key: 'capitalInvested', header: 'Capital Invested', align: 'right', num: true, render: (r) => money(r.capitalInvested, r.cur) },
  { key: 'investments', header: 'Investments', align: 'right', num: true, render: (r) => money(r.investments, r.cur) },
  { key: 'loans', header: 'Loans', align: 'right', num: true, render: (r) => money(r.loans, r.cur) },
  { key: 'capitalEmployed', header: 'Capital Employed', align: 'right', num: true, render: (r) => money(r.capitalEmployed, r.cur) },
  { key: 'profit', header: 'Profit', align: 'right', num: true, render: (r) => <span className={`${r.profit < 0 ? 'text-danger' : 'text-success'} tabular-nums`}>{money(r.profit, r.cur)}</span> },
];

function FixFirstCheck() {
  const lq = useQuery({ queryKey: ['tk', 'limits'], queryFn: getLimits, staleTime: 5 * 60_000 });
  const limits = (lq.data && lq.data.limits) || {};
  const [m, setM] = useState({ roi: '', overduePct: '', budgetOverPct: '' });
  const anyInput = m.roi !== '' || m.overduePct !== '' || m.budgetOverPct !== '';
  const flags = anyInput ? fixFirstFlags(m, limits) : [];
  return (
    <PageSection title={'Investment "fix-first" check'}>
      <p className="mb-2 text-xs text-ink-muted">Enter a proposed investment's numbers — it flags "fix first" against the Owner-set thresholds (ROI ≥ {limits.investmentMinRoi ?? 1.5}×, overdue ≤ {limits.investmentMaxOverduePct ?? 15}%, budget-over ≤ {limits.investmentMaxBudgetOverPct ?? 10}%).</p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5 text-ink">ROI (×) <Input aria-label="ROI" type="number" step="any" value={m.roi} onChange={(e) => setM((s) => ({ ...s, roi: e.target.value }))} className="w-20 text-right" /></label>
        <label className="flex items-center gap-1.5 text-ink">Overdue AR (%) <Input aria-label="Overdue percent" type="number" step="any" value={m.overduePct} onChange={(e) => setM((s) => ({ ...s, overduePct: e.target.value }))} className="w-20 text-right" /></label>
        <label className="flex items-center gap-1.5 text-ink">Budget over (%) <Input aria-label="Budget over percent" type="number" step="any" value={m.budgetOverPct} onChange={(e) => setM((s) => ({ ...s, budgetOverPct: e.target.value }))} className="w-20 text-right" /></label>
      </div>
      {anyInput ? (
        flags.length
          ? <div role="status" className="mt-2 text-xs font-semibold text-danger">⚠ Fix first: {flags.join(' · ')}</div>
          : <div role="status" className="mt-2 text-xs font-semibold text-success">✓ Clear to invest — no threshold breached.</div>
      ) : null}
    </PageSection>
  );
}

export function InvestmentDashboard() {
  const { from, to } = fyRange(new Date());
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const q = useQueries({ queries: view.map((b) => ({ queryKey: ['tk', 'invest', b.code, from, to], queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const rows = view.map((b, i) => investmentRow(b, q[i] && q[i].data));

  return (
    <div className="grid gap-4">
      <FixFirstCheck />
      <p className="text-xs text-ink-muted">
        FY {from} → {to} · {isFocused(focus) ? <b>{focus} — focused</b> : <b>branchwise</b>} — each branch in its own currency, never consolidated.
      </p>
      <div data-testid="tk-investment">
        <DataTable
          title="Investment / Capital"
          columns={COLS}
          rows={rows}
          loading={q.some((x) => x.isLoading)}
          isError={q.length > 0 && q.every((x) => x.isError)}
          getRowKey={(r) => r.code}
          emptyMessage="No capital figures yet."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
      <p className="text-xs text-ink-subtle">Branchwise — never consolidated. Investment requests are raised under Decisions and approved by Farhan + Owner.</p>
    </div>
  );
}
