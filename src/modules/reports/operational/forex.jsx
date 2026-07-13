import React, { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { exportToCSV } from '../../../core/business-logic';
import { bc } from '../../../core/styles';
import { money } from '../../../core/format';
import { CUR_MONTH, PERIOD_OPTIONS } from '../../../core/dates';
import { ReportSearch, matchNeedle } from '../../../core/reportDateBar';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, Button, StatusPill } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

export function ForexReport({ branch }) {
  const cur = bc(branch).cur;
  const f = (n) => money(n, cur);
  const [period, setPeriod] = useState(CUR_MONTH);
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();

  // India-only / INR base — no foreign-currency settlements.
  const FOREX_DATA = [];
  const filtered = FOREX_DATA.filter((r) => (r.date.startsWith(period) || period === 'YTD') && matchNeedle([r.date, r.ccy, r.type, r.party, r.status], needle));
  const realized = filtered.filter((r) => r.status === 'Settled');
  const totalGain = realized.reduce((s, r) => s + r.gain, 0);
  const totalUnreal = filtered.filter((r) => r.status === 'Unsettled').length;

  const KPIS = [
    { l: 'Realized Gain/(Loss)', v: f(totalGain), c: totalGain >= 0 ? '#16a34a' : '#dc2626' },
    { l: 'Gain Transactions', v: String(realized.filter((r) => r.gain > 0).length), c: '#16a34a' },
    { l: 'Loss Transactions', v: String(realized.filter((r) => r.gain < 0).length), c: '#dc2626' },
    { l: 'Unsettled (Unrealized)', v: String(totalUnreal), c: '#d97706' },
    { l: 'Total FCY Volume', v: `${filtered.reduce((s, r) => s + r.fcAmt, 0).toLocaleString()} FCY`, c: '#2563eb' },
  ];

  const columns = [
    { key: 'date', header: 'Date', className: 'text-ink-muted' },
    { key: 'ccy', header: 'CCY', render: (r, v) => <StatusPill tone="navy" size="sm">{v}</StatusPill> },
    { key: 'type', header: 'Type', className: 'text-role-hr' },
    { key: 'party', header: 'Party', className: 'font-semibold text-navy' },
    { key: 'fcAmt', header: 'FCY Amount', num: true, render: (r, v) => v?.toLocaleString() },
    { key: 'rate', header: 'Rate Booked', num: true, className: 'font-mono text-[10px]' },
    { key: 'inrAmt', header: 'INR Booked', num: true, render: (r, v) => f(v) },
    { key: 'settleRate', header: 'Rate Settled', num: true, className: 'font-mono text-[10px]', render: (r, v) => v || '—' },
    { key: 'settleInr', header: 'INR Settled', num: true, render: (r, v) => (v ? f(v) : '—') },
    { key: 'gain', header: 'Gain/(Loss)', num: true, render: (r, v) => (v ? <span className={`font-bold ${v > 0 ? 'text-[#16a34a]' : 'text-maroon'}`}>{f(v)}</span> : '—'), footer: (rs) => f(rs.filter((r) => r.status === 'Settled').reduce((s, r) => s + r.gain, 0)), footerLabel: 'NET' },
    { key: 'status', header: 'Status', render: (r, v) => <StatusPill tone={v === 'Settled' ? 'success' : 'warning'} size="sm">{v}</StatusPill> },
  ];

  const filters = (
    <>
      <ReportSearch value={search} onChange={setSearch} placeholder="Party / currency / type…" />
      <DropdownMenu
        ariaLabel="Period"
        menuRole="listbox"
        width={170}
        items={PERIOD_OPTIONS.map((p) => ({ key: p.v, label: p.l, selected: period === p.v, onSelect: () => setPeriod(p.v) }))}
        renderTrigger={({ ref, toggle, triggerProps }) => (
          <button ref={ref} {...triggerProps} onClick={toggle} type="button"
            className="flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-alt">
            {PERIOD_OPTIONS.find((p) => p.v === period)?.l || period}
            <ChevronDown size={13} className="text-ink-subtle" />
          </button>
        )}
      />
    </>
  );

  const csvButton = (
    <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCSV(filtered, ['date', 'ccy', 'type', 'party', 'fcAmt', 'rate', 'gain', 'status'], 'forex.csv')}>CSV</Button>
  );

  return (
    <RptShell title="Forex Gain / Loss Report" subtitle="Foreign currency settlements · Realized + Unrealized" filters={filters} actions={csvButton}>
      <ResponsiveGrid min="150px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3 py-4" style={{ borderTopColor: k.c }}>
            <p className="text-[8.5px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-navy tablet:text-lg">{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(r, i) => i}
        dense
        emptyMessage="No foreign-currency settlements."
        emptyHint="The book is India-only / INR base — FX gain/loss appears here once foreign-currency settlements are posted."
      />

      <div className="mt-3 rounded-brand border border-[#cfe0f8] bg-[#e8f0ff] px-3.5 py-2.5 text-[10px] leading-relaxed text-[#2563eb]">
        Forex Gain/Loss is posted to GL via Journal Entry. Rate booked = rate at invoice. Rate settled = rate at payment.
        Unrealized: open positions at period-end rated at the closing rate.
      </div>
    </RptShell>
  );
}

export default ForexReport;
