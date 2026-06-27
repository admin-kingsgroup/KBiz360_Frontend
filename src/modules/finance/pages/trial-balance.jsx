import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { useTrialBalance } from '../hooks/use-trial-balance';
import { useFinanceStore } from '../store/finance.store';
import { ALL_TIME_FROM, CUR_FY, CUR_QUARTER, CUR_MONTH, todayISO, fmtDate } from '../../../core/dates';
import { toastError } from '../../../core/ux/toast';
import { localeOf } from '../../../core/format';

/* Money formatter — currency symbol + grouping locale from the branch config
   (Indian lakh/crore for ₹, Western thousands for USD branches).
   Zero/empty renders as an em-dash so the grid reads cleanly. */
const money = (cur, n) => (n ? `${cur}${Math.round(n).toLocaleString(localeOf(cur))}` : '—');

/**
 * Trial Balance — LIVE from the double-entry engine (GET /api/accounting/trial-balance).
 * Thin page: orchestrates the server-state hook + the UI store + the reusable
 * PageLayout / DataTable. No seed data, no business-entity local state.
 */
export function TrialBalancePage({ branch }) {
  const { from, to, view, includeZero } = useFinanceStore((s) => s.trialBalance);
  const setPeriod = useFinanceStore((s) => s.setTrialBalancePeriod);
  const setView = useFinanceStore((s) => s.setTrialBalanceView);
  const setIncludeZero = useFinanceStore((s) => s.setTrialBalanceIncludeZero);

  const { data, isLoading, isError, error, refetch, currencySymbol: cur } = useTrialBalance(branch, { from, to, includeZero });
  const rows = data?.rows ?? [];

  const sumFooter = (key) => (rs) => money(cur, rs.reduce((s, r) => s + (r[key] || 0), 0));

  const columns = useMemo(() => {
    const m = (row, v) => money(cur, v);
    if (view === 'summary') {
      return [
        { key: 'group', header: 'Group', footer: () => 'TOTAL', className: 'font-medium', width: '16rem' },
        { key: 'ledger', header: 'Ledger Account' },
        { key: 'closingDebit', header: `Closing Dr (${cur})`, num: true, render: m, footer: sumFooter('closingDebit') },
        { key: 'closingCredit', header: `Closing Cr (${cur})`, num: true, render: m, footer: sumFooter('closingCredit') },
      ];
    }
    return [
      { key: 'group', header: 'Group', footer: () => 'TOTAL', className: 'font-medium', width: '14rem', hideable: false },
      { key: 'code', header: 'Code', width: '5rem', className: 'text-ink-muted' },
      { key: 'ledger', header: 'Ledger Account', hideable: false },
      { key: 'openingDebit', header: 'Opening Dr', num: true, render: m, footer: sumFooter('openingDebit') },
      { key: 'openingCredit', header: 'Opening Cr', num: true, render: m, footer: sumFooter('openingCredit') },
      { key: 'debit', header: 'Debit', num: true, render: m, footer: sumFooter('debit') },
      { key: 'credit', header: 'Credit', num: true, render: m, footer: sumFooter('credit') },
      { key: 'closingDebit', header: 'Closing Dr', num: true, render: m, footer: sumFooter('closingDebit') },
      { key: 'closingCredit', header: 'Closing Cr', num: true, render: m, footer: sumFooter('closingCredit') },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cur]);

  const presets = [
    { label: 'All', from: ALL_TIME_FROM, to: todayISO() },
    { label: 'This FY', from: CUR_FY.startISO, to: todayISO() },
    { label: 'This Quarter', from: CUR_QUARTER.startISO, to: CUR_QUARTER.endISO },
    { label: 'This Month', from: `${CUR_MONTH}-01`, to: `${CUR_MONTH}-31` },
  ];
  const isActivePreset = (p) => p.from === from && p.to === to;

  const balanced = data?.balanced ?? true;
  const subtitle = data
    ? `${data.rows.length} ledgers · Closing Dr ${money(cur, data.grandClosingDebit)} = Cr ${money(cur, data.grandClosingCredit)}`
    : 'Live from the double-entry engine';

  const filters = (
    <>
      {/* Include zero-balance accounts */}
      <label className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-fast hover:bg-surface-alt max-tablet:min-h-[44px]">
        <input type="checkbox" checked={includeZero} onChange={(e) => setIncludeZero(e.target.checked)}
          className="h-3.5 w-3.5 accent-navy" />
        Show nil-balance accounts
      </label>
      <span className="mx-1 hidden h-5 w-px bg-surface-border tablet:block" />
      {/* View toggle */}
      <div className="inline-flex overflow-hidden rounded-md border border-surface-border">
        {['detailed', 'summary'].map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors duration-fast max-tablet:min-h-[44px] max-tablet:px-4 ${view === v ? 'bg-navy text-white' : 'bg-surface text-ink-muted hover:bg-surface-alt'}`}>
            {v}
          </button>
        ))}
      </div>
      <span className="mx-1 hidden h-5 w-px bg-surface-border tablet:block" />
      {/* Period presets */}
      {presets.map((p) => (
        <button key={p.label} onClick={() => setPeriod(p.from, p.to)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-fast max-tablet:min-h-[44px] ${isActivePreset(p) ? 'border-gold bg-gold-light/30 text-navy' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'}`}>
          {p.label}
        </button>
      ))}
      {/* Custom range */}
      <input type="date" value={from} max={to} onChange={(e) => setPeriod(e.target.value, to)} aria-label="From date"
        className="h-9 rounded-md border border-surface-border bg-surface px-2 text-xs text-ink outline-none transition-[box-shadow,border-color] duration-fast focus:border-info focus:shadow-focus-ring max-tablet:h-11" />
      <span className="text-xs text-ink-subtle">→</span>
      <input type="date" value={to} min={from} onChange={(e) => setPeriod(from, e.target.value)} aria-label="To date"
        className="h-9 rounded-md border border-surface-border bg-surface px-2 text-xs text-ink outline-none transition-[box-shadow,border-color] duration-fast focus:border-info focus:shadow-focus-ring max-tablet:h-11" />
    </>
  );

  return (
    <PageLayout title="Trial Balance" subtitle={`Live · ${fmtDate(from)} → ${fmtDate(to)}`} filters={filters}>
      {/* Balanced banner — reflects the FULL trial balance from the server */}
      {data && (
        balanced ? (
          <div className="mb-3 flex items-center gap-2 rounded-brand border border-success/40 bg-success-soft px-3 py-2 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            Trial Balance tallied — Dr {money(cur, data.grandClosingDebit)} = Cr {money(cur, data.grandClosingCredit)}
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-2 rounded-brand border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            Out of balance — Dr {money(cur, data.grandClosingDebit)} vs Cr {money(cur, data.grandClosingCredit)}
          </div>
        )
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => Promise.resolve(refetch()).catch(() => toastError('Retry failed — still unable to load the trial balance.'))}
        searchable
        searchPlaceholder="Search ledger / group / code…"
        stickyHeader
        stickyFirstColumn
        showColumnToggle
        showDensityToggle
        exportName={`trial-balance-${from}_${to}`}
        printTitle="Trial Balance"
        printSubtitle={subtitle}
        dense
        initialSort={{ key: 'group', dir: 'asc' }}
        getRowKey={(r) => `${r.group}|${r.ledger}|${r.code}`}
        emptyMessage="No ledger balances for this period."
        emptyHint="Post some vouchers, or widen the date range."
        title="Ledger balances"
        subtitle={subtitle}
      />
    </PageLayout>
  );
}

export default TrialBalancePage;
