import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { calendarKpis, dueTone, filingBranchRows, prevMonth } from './utils/taxDesk';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { DataTable } from '../../shell/DataTable';
import { PageSection, Badge } from '../../shell/primitives';
import { money } from '../../core/format';

// ─── TK GROUP CENTRAL · Tax Desk ─────────────────────────────────────────────
// Central statutory oversight: the org-wide compliance calendar (a filing is entity /
// return level, not a sum of branch figures — so this part is genuinely central) plus a
// BRANCHWISE filing-status matrix. Reuses /api/tax-calendar/dues and
// /api/tax-reconciliation/filing-board. Shared design system (DataTable · Badge · tokens).
const DUE_COLS = [
  { key: 'due', header: 'Due', align: 'left', render: (r) => <span className="tabular-nums">{r.due}</span> },
  { key: 'authority', header: 'Authority', align: 'left', render: (r) => r.authority },
  { key: 'filing', header: 'Filing', align: 'left', render: (r) => r.filing },
  { key: 'entity', header: 'Entity', align: 'left', render: (r) => r.entity || '—' },
  { key: 'amount', header: 'Amount', align: 'right', num: true, render: (r) => money(r.amount, '₹') },
  { key: 'daysLeft', header: 'Days', align: 'right', num: true, render: (r) => <span className="tabular-nums">{r.daysLeft}</span> },
  { key: 'status', header: 'Status', align: 'left', render: (r) => <Badge tone={dueTone(r.status)} size="sm">{r.status}</Badge> },
];

const FILING_COLS = [
  { key: 'code', header: 'Branch', align: 'left', render: (r) => <span className="font-bold">{r.code}</span> },
  { key: 'regime', header: 'Regime', align: 'left', render: (r) => r.regime || '—' },
  { key: 'filed', header: 'Filed', align: 'right', num: true, render: (r) => <span className="text-success tabular-nums">{r.filed}</span> },
  { key: 'pending', header: 'Pending', align: 'right', num: true, render: (r) => <span className={`tabular-nums ${r.pending ? 'text-danger font-semibold' : 'text-ink-subtle'}`}>{r.pending}</span> },
  { key: 'pct', header: 'Filed %', align: 'right', num: true, render: (r) => <Badge tone={r.pct === 100 ? 'success' : r.pct > 0 ? 'warning' : 'danger'} size="sm">{r.pct}%</Badge> },
];

// KPI card — the number is tinted by severity (tone); the label is the caption. No
// redundant chip echoing the label.
const KPI_TONE_TEXT = { danger: 'text-danger', warning: 'text-warning', info: 'text-info', success: 'text-success' };
function Kpi({ label, value, tone }) {
  return (
    <div className="rounded-brand border border-surface-border bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`mt-0.5 text-[22px] font-semibold tabular-nums ${KPI_TONE_TEXT[tone] || 'text-ink'}`}>{value}</div>
    </div>
  );
}

export function TaxDesk() {
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const focusCodes = view.map((b) => b.code);
  const period = prevMonth(new Date());

  const dq = useQuery({ queryKey: ['tk', 'tax-dues'], queryFn: () => apiGet('/api/tax-calendar/dues'), staleTime: 60_000 });
  const bq = useQuery({ queryKey: ['tk', 'filing-board', period], queryFn: () => apiGet('/api/tax-reconciliation/filing-board', { period }), staleTime: 60_000 });

  const totals = (dq.data && dq.data.totals) || {};
  const dueRows = (dq.data && Array.isArray(dq.data.rows)) ? dq.data.rows : [];
  const filingRows = filingBranchRows(bq.data, focusCodes);
  const dueValue = Number(totals.dueValue) || 0;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        {calendarKpis(totals).map((k) => <Kpi key={k.key} label={k.label} value={k.value} tone={k.tone} />)}
      </div>
      <p className="text-xs text-ink-muted">Statutory dues owed (not yet filed): <b className="text-ink tabular-nums">{money(dueValue, '₹')}</b>. The compliance calendar is org-wide — a filing is entity / return level, never a branch sum.</p>

      <div data-testid="tk-tax-dues">
        <DataTable title="Statutory Dues Calendar" columns={DUE_COLS} rows={dueRows} getRowKey={(r) => r.id} emptyMessage="No statutory dues on the calendar." searchable={false} showDensityToggle={false} zebra />
      </div>

      <PageSection title={`Filing Status — ${period} (branchwise)`}>
        <p className="mb-2 text-xs text-ink-muted">
          {isFocused(focus) ? <b>{focus} — focused</b> : <b>branchwise</b>} — each branch's returns for the last fileable month. Filed status is proven by an entered figure; branchwise, never consolidated.
        </p>
        <div data-testid="tk-filing-board">
          <DataTable columns={FILING_COLS} rows={filingRows} getRowKey={(r) => r.code} emptyMessage="No filing figures for this period yet." searchable={false} showDensityToggle={false} zebra />
        </div>
      </PageSection>
    </div>
  );
}
