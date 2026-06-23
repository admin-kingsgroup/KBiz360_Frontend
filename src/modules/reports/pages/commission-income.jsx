/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Commission Income (estimated) — LIVE revenue, modelled comm.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Math unchanged: revenue is live (useGpBills),
   commission is ESTIMATED at standard rates (Insurance 15 / Flight 2 /
   Holiday 3 / other 1 %) with TDS 194H @2% over ₹15k. KPIs → ResponsiveGrid;
   table → DataTable with totals footer, Excel export, mobile scroll.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { bc } from '../../../core/styles';
import { useGpBills } from '../../../core/useAccounting';
import { ReportSearch, ReportDateBar, resolveReportRange, matchNeedle } from '../../../core/reportDateBar';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const RATE = (mod) => (mod === 'Insurance' ? 15 : mod === 'Flight' ? 2 : mod === 'Holiday' ? 3 : 1);

export function ReportCommission({ branch }) {
  const cur = bc(branch).cur;
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const [search, setSearch] = useState('');
  const q = useGpBills(branch, { from: range.from || undefined, to: range.to || undefined });
  const bills = q.data || [];
  const f = (n) => cur + Number(Math.round(n)).toLocaleString('en-IN');

  const rows = useMemo(() => {
    const suppMap = {};
    bills.forEach((b) => {
      if (!suppMap[b.supplier]) suppMap[b.supplier] = { supplier: b.supplier, mod: b.mod, bookings: 0, revenue: 0, commRate: 0, commission: 0 };
      const rate = RATE(b.mod);
      suppMap[b.supplier].bookings++;
      suppMap[b.supplier].revenue += b.sell;
      suppMap[b.supplier].commRate = rate;
      suppMap[b.supplier].commission += Math.round(b.sell * rate / 100);
    });
    return Object.values(suppMap).sort((a, b) => b.commission - a.commission);
  }, [bills]);

  const needle = search.trim().toLowerCase();
  const filtered = useMemo(
    () => rows.filter((r) => matchNeedle([r.supplier, r.mod], needle))
      .map((r) => { const tdsAmt = r.commission > 15000 ? Math.round(r.commission * 0.02) : 0; return { ...r, tdsAmt, net: r.commission - tdsAmt }; }),
    [rows, needle],
  );

  const totComm = filtered.reduce((s, r) => s + r.commission, 0);
  const totRev = filtered.reduce((s, r) => s + r.revenue, 0);
  const tds = filtered.reduce((s, r) => s + r.tdsAmt, 0);

  const KPIS = [
    { l: 'Total Commission', v: f(totComm), c: '#16a34a' },
    { l: 'On Revenue', v: f(totRev), c: '#2563eb' },
    { l: 'TDS 194H (2%)', v: f(tds), c: '#dc2626' },
    { l: 'Net Receivable', v: f(totComm - tds), c: '#3fb7a3' },
  ];

  const columns = [
    { key: 'supplier', header: 'Supplier / Principal', className: 'font-semibold text-navy', hideable: false, footerLabel: `TOTAL — ${filtered.length} principals` },
    { key: 'mod', header: 'Module', render: (r, v) => <StatusPill tone="info" size="sm">{v}</StatusPill> },
    { key: 'bookings', header: 'Bookings', num: true, className: 'text-ink-muted' },
    { key: 'revenue', header: 'Revenue', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.revenue, 0)) },
    { key: 'commRate', header: 'Comm %', num: true, className: 'font-bold text-[#16a34a]', render: (r, v) => `${v}%` },
    { key: 'commission', header: 'Commission Earned', num: true, className: 'font-bold text-[#16a34a]', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.commission, 0)) },
    { key: 'tdsAmt', header: 'TDS 194H', num: true, render: (r, v) => (v > 0 ? <span className="text-maroon">{f(v)}</span> : <span className="text-ink-subtle">—</span>), footer: (rs) => f(rs.reduce((s, r) => s + r.tdsAmt, 0)) },
    { key: 'net', header: 'Net Payable', num: true, className: 'font-bold', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.net, 0)) },
  ];

  return (
    <RptShell
      title="Commission Income (estimated)"
      subtitle="Revenue is live from the books; commission is estimated at standard rates (Insurance 15%, Flight 2%, Holiday 3%, other 1%) with TDS 194H @2% — not actual booked commission."
      filters={<><ReportSearch value={search} onChange={setSearch} placeholder="Supplier / module…" /><ReportDateBar value={range} onChange={setRange} branch={branch} /></>}
    >
      <ResponsiveGrid min="140px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable
        loading={q.isLoading}
        isError={q.isError}
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.supplier}
        dense
        initialSort={{ key: 'commission', dir: 'desc' }}
        exportName="commission-income"
        printTitle="Commission Income (estimated)"
        emptyMessage={needle ? `No principal matches “${search}”.` : 'No bookings in this date range.'}
        emptyHint={needle ? undefined : 'Widen the range (try “All”) or post sale vouchers for this branch.'}
      />
    </RptShell>
  );
}

export default ReportCommission;
