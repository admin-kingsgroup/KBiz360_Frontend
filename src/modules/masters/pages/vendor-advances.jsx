/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Vendor / Supplier Advances — unadjusted advances + ageing.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Branch scope + filter + totals/ageing math
   unchanged (VENDOR_ADVANCES_DATA). KPIs → ResponsiveGrid; grid → DataTable
   (sort/sticky/totals/export/mobile scroll).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { bc } from '../../../core/styles';
import { fmt } from '../../../core/format';
import { useMasterList } from '../../../core/useMasters';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, Button } from '../../../shell/primitives';

export function VendorAdvances({ branch }) {
  const cur = bc(branch).cur;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const [filter, setFilter] = useState('Unadjusted');

  // Live vendor-advance register (/api/vendor-advances). advId surfaces as the row id.
  const { data = [] } = useMasterList('vendor-advances');
  const VENDOR_ADVANCES_DATA = useMemo(() => (data || []).map((a) => ({ ...a, id: a.advId || a.id })), [data]);
  const all = VENDOR_ADVANCES_DATA.filter((a) => !brCode || a.branch === brCode);
  const visible = filter === 'Unadjusted' ? all.filter((a) => a.unadjusted > 0) : filter === 'Fully Adjusted' ? all.filter((a) => a.unadjusted === 0) : all;

  const totGiven = visible.reduce((s, a) => s + a.amount, 0);
  const totAdj = visible.reduce((s, a) => s + a.adjusted, 0);
  const totUnadj = visible.reduce((s, a) => s + a.unadjusted, 0);
  const aged = visible.filter((a) => a.ageDays > 30 && a.unadjusted > 0).length;
  const money = (n) => cur + fmt(n);

  const KPIS = [
    { l: 'Total Advances Given', v: money(totGiven), c: '#2563eb' },
    { l: 'Adjusted', v: money(totAdj), c: '#16a34a' },
    { l: 'Unadjusted', v: money(totUnadj), c: '#dc2626', sub: `${aged} aged > 30 days` },
    { l: 'Records', v: String(visible.length), c: '#d97706' },
  ];

  const columns = [
    { key: 'id', header: 'Advance ID', className: 'font-mono text-[10px] text-[#2563eb]', hideable: false },
    { key: 'vendor', header: 'Vendor', className: 'font-semibold text-navy', render: (r, v) => <div>{v}<div className="text-[9.5px] font-normal text-ink-muted">{r.contact}</div></div> },
    { key: 'vendorType', header: 'Type', align: 'center', render: (r, v) => <StatusPill tone={v === 'Airline' ? 'info' : 'warning'} size="sm">{v}</StatusPill> },
    { key: 'date', header: 'Date', align: 'center', className: 'text-ink-muted' },
    { key: 'amount', header: 'Amount', num: true, render: (r, v) => money(v), footer: (rs) => money(rs.reduce((s, r) => s + r.amount, 0)) },
    { key: 'adjusted', header: 'Adjusted', num: true, className: 'text-[#16a34a]', render: (r, v) => money(v), footer: (rs) => money(rs.reduce((s, r) => s + r.adjusted, 0)) },
    { key: 'unadjusted', header: 'Unadjusted', num: true, render: (r, v) => <span className="font-bold" style={{ color: v > 0 ? '#dc2626' : '#5b616e' }}>{money(v)}</span>, footer: (rs) => money(rs.reduce((s, r) => s + r.unadjusted, 0)) },
    { key: 'ageDays', header: 'Age', num: true, align: 'center', render: (r, v) => <span className="font-semibold" style={{ color: v > 30 ? '#dc2626' : v > 15 ? '#d97706' : '#16a34a' }}>{v}d</span> },
    { key: 'ref', header: 'Reference', className: 'text-[10px] text-ink-muted' },
  ];

  return (
    <PageLayout
      title="Vendor / Supplier Advances"
      subtitle="Unadjusted advances · Airline block deposits · DMC pre-payments · Ageing & reconciliation"
      actions={<Button size="sm" variant="accent" icon={Plus}>Record Advance</Button>}
      filters={['Unadjusted', 'Fully Adjusted', 'All'].map((ff) => (
        <button key={ff} onClick={() => setFilter(ff)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${filter === ff ? 'border-navy bg-navy text-gold' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'}`}>{ff}</button>
      ))}
    >
      <ResponsiveGrid min="200px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-2.5" style={{ borderTopColor: k.c }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{k.l}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums tablet:text-lg" style={{ color: k.c }}>{k.v}</p>
            {k.sub && <p className="text-[10px] text-ink-muted">{k.sub}</p>}
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable columns={columns} rows={visible} getRowKey={(r) => r.id} dense exportName="vendor-advances" printTitle="Vendor / Supplier Advances" emptyMessage="No advances for this filter." />
    </PageLayout>
  );
}

export default VendorAdvances;
