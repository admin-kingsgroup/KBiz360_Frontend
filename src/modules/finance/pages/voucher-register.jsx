import React, { useMemo, useState } from 'react';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { StatusPill } from '../../../shell/primitives';
import { Modal } from '../../../core/ux/Modal';
import { toastError } from '../../../core/ux/toast';
import { VoucherView } from '../../pnlTally';
import { useVoucherRegister } from '../hooks/use-voucher-register';
import { useFinanceStore } from '../store/finance.store';
import { useFyStore } from '../../../store/fy';
import { fmtDate } from '../../../core/dates';
import { localeOf } from '../../../core/format';

const money = (cur, n) => (n ? `${cur}${Math.round(n).toLocaleString(localeOf(cur))}` : '—');

const STATUS_TONE = { approved: 'success', pending: 'warning', rejected: 'danger', deleted: 'neutral' };
function StatusChip({ status }) {
  if (!status) return <span className="text-ink-subtle">—</span>;
  return <StatusPill tone={STATUS_TONE[status] || 'neutral'} size="sm" className="capitalize">{status}</StatusPill>;
}

/**
 * Reusable voucher register — LIVE from GET /api/vouchers (one category).
 * Period is driven by the global Financial-Year selector in the app-bar. Thin
 * page: orchestrates the hook + PageLayout + DataTable; no business-entity state.
 */
export function VoucherRegisterPage({ branch, category, title }) {
  const fy = useFyStore((s) => s.fy);
  const override = useFinanceStore((s) => s.register);
  const setRegisterPeriod = useFinanceStore((s) => s.setRegisterPeriod);
  const resetRegisterPeriod = useFinanceStore((s) => s.resetRegisterPeriod);
  const [viewId, setViewId] = useState(null);

  // Effective period: custom override (if set) else the global Financial Year.
  const from = override.from || fy.startISO;
  const to = override.to || fy.endISO;
  const isOverridden = !!(override.from || override.to);

  const { data = [], isLoading, isError, error, refetch, currencySymbol: cur } =
    useVoucherRegister(branch, category, { from, to });

  const columns = useMemo(() => [
    { key: 'vno', header: 'Voucher No', sticky: 'left', width: '12rem', hideable: false, render: (r) => <span className="font-semibold text-navy">{r.vno}</span> },
    { key: 'tallyRef', header: 'Tally Ref', width: '9rem', className: 'text-ink-muted', render: (r, v) => v || '—' },
    { key: 'date', header: 'Date', width: '7rem', render: (r, v) => (v ? fmtDate(v) : '—') },
    { key: 'branch', header: 'Branch', width: '6rem', className: 'text-ink-muted' },
    { key: 'account', header: 'Account / Party', width: '16rem' },
    { key: 'narration', header: 'Narration', className: 'text-ink-muted' },
    { key: 'mode', header: 'Mode', width: '7rem', className: 'text-ink-muted' },
    { key: 'amount', header: `Amount (${cur})`, num: true, width: '11rem', render: (r, v) => money(cur, v), footer: (rs) => money(cur, rs.reduce((s, r) => s + (r.amount || 0), 0)) },
    { key: 'status', header: 'Status', align: 'center', width: '7rem', render: (r) => <StatusChip status={r.status} /> },
  ], [cur]);

  const subtitle = isOverridden
    ? `Live · ${fmtDate(from)} → ${fmtDate(to)} · ${data.length} vouchers`
    : `Live · FY ${fy.label} (${fmtDate(from)} → ${fmtDate(to)}) · ${data.length} vouchers`;

  // Date-range override (falls back to the global FY when cleared).
  const filters = (
    <>
      <span className="text-xs font-semibold text-ink-muted">Period</span>
      <input type="date" value={from} max={to} onChange={(e) => setRegisterPeriod(e.target.value, to)} aria-label="From date"
        className="h-9 rounded-md border border-surface-border bg-surface px-2 text-xs text-ink outline-none transition-[box-shadow,border-color] duration-fast focus:border-info focus:shadow-focus-ring max-tablet:h-11" />
      <span className="text-xs text-ink-subtle">→</span>
      <input type="date" value={to} min={from} onChange={(e) => setRegisterPeriod(from, e.target.value)} aria-label="To date"
        className="h-9 rounded-md border border-surface-border bg-surface px-2 text-xs text-ink outline-none transition-[box-shadow,border-color] duration-fast focus:border-info focus:shadow-focus-ring max-tablet:h-11" />
      {isOverridden ? (
        <button onClick={resetRegisterPeriod}
          className="rounded-md border border-gold bg-gold-light/30 px-3 py-1.5 text-xs font-medium text-navy transition-colors duration-fast hover:bg-gold-light/50 max-tablet:min-h-[44px]">
          ↺ Follow FY {fy.label}
        </button>
      ) : (
        <span className="text-xs text-ink-subtle">following the header FY ({fy.label})</span>
      )}
    </>
  );

  return (
    <PageLayout title={title} subtitle={subtitle} filters={filters}>
      <DataTable
        columns={columns}
        rows={data}
        loading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => Promise.resolve(refetch()).catch(() => toastError('Retry failed — still unable to load this register.'))}
        searchable
        searchPlaceholder="Search voucher / account / narration…"
        stickyHeader
        showColumnToggle
        showDensityToggle
        exportName={`${category}-register-${from}_${to}`}
        printTitle={title}
        printSubtitle={subtitle}
        onRowClick={(r) => r.id && setViewId(r.id)}
        dense
        pageSize={50}
        initialSort={{ key: 'date', dir: 'desc' }}
        getRowKey={(r) => r.id || r.vno}
        emptyMessage={`No ${category} vouchers for this period.`}
        emptyHint="Adjust the dates above or the financial year in the header."
        title="Vouchers"
        subtitle="Click any row to view the full voucher"
      />

      {viewId && (
        <Modal title="Voucher" sub="Full double-entry detail" wide onClose={() => setViewId(null)}>
          <VoucherView id={viewId} cur={cur} />
        </Modal>
      )}
    </PageLayout>
  );
}

// Thin per-category wrappers mounted by the router / menu.
export const ReceiptRegisterPage = (props) => <VoucherRegisterPage {...props} category="receipt" title="Receipt Register" />;
export const PaymentRegisterPage = (props) => <VoucherRegisterPage {...props} category="payment" title="Payment Register" />;
export const ContraRegisterPage  = (props) => <VoucherRegisterPage {...props} category="contra"  title="Contra Register" />;
export const JournalRegisterPage = (props) => <VoucherRegisterPage {...props} category="journal" title="Journal Register" />;

export default VoucherRegisterPage;
