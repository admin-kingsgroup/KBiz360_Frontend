/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Currency Master — currencies + daily INR exchange rates.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx onto PageLayout + DataTable (sort/sticky/export/
   mobile scroll). Data + filter logic unchanged (CURRENCY_DATA). The toolbar
   buttons remain visual placeholders for future wiring, as before.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo } from 'react';
import { RefreshCw, Upload, Plus } from 'lucide-react';
import { useCurrencies } from '../../../core/useReference';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Button, StatusPill } from '../../../shell/primitives';

export function CurrencyMaster({ setRoute }) {
  const [search, setSearch] = useState('');
  // Live currency metadata from /api/app-config/currencies — an object keyed by code:
  // { INR: { symbol, name, toINR }, USD: {...}, ... }. Mapped to table rows here.
  // This endpoint is read-only; exchange rates are created/edited on the Forex Rates
  // screen (/masters/forex), so the rate actions navigate there.
  const { data: meta, refetch, isFetching } = useCurrencies();
  const go = (r) => setRoute && setRoute(r);
  const rows = useMemo(() => Object.entries(meta || {}).map(([code, m]) => ({
    code,
    name: m?.name || code,
    symbol: m?.symbol || '',
    dailyRate: Number(m?.toINR) || 0,
    isBase: code === 'INR' || Number(m?.toINR) === 1,
    lastUpdated: m?.updatedAt || '',
    active: m?.active !== false,
  })), [meta]);
  const filtered = rows.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const columns = [
    { key: 'code', header: 'Code', hideable: false, render: (r, v) => <span className="inline-flex items-center gap-1.5"><span className="font-mono font-bold text-navy">{v}</span>{r.isBase && <span className="rounded bg-gold px-1.5 py-0.5 text-[9px] font-bold text-navy">BASE</span>}</span> },
    { key: 'name', header: 'Name', className: 'text-navy' },
    { key: 'symbol', header: 'Symbol', align: 'center', className: 'text-sm text-navy' },
    { key: 'dailyRate', header: '1 unit = ₹', num: true, className: 'font-mono font-bold', render: (r, v) => v.toFixed(4) },
    { key: 'lastUpdated', header: 'Last Updated', className: 'text-ink-muted', render: (r, v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN'); } },
    { key: 'active', header: 'Status', align: 'center', render: (r, v) => <StatusPill tone={v ? 'success' : 'danger'} size="sm">{v ? 'Active' : 'Inactive'}</StatusPill> },
    { key: '__act', header: 'Action', align: 'center', sortable: false, exportable: false, hideable: false, render: (r) => <Button variant="secondary" size="xs" onClick={() => go('/masters/forex')} title={`Manage the ${r.code} exchange rate on the Forex Rates screen`} disabled={r.isBase}>Edit Rate</Button> },
  ];

  return (
    <PageLayout
      title="Currency Master"
      subtitle="All currencies used by Travkings — daily exchange rates auto-update at 9 AM IST"
      actions={
        <>
          <Button size="sm" variant="secondary" icon={RefreshCw} className="border-gold text-gold-dark" loading={isFetching} onClick={() => refetch()} title="Re-pull the latest exchange rates from the server">Refresh Rates</Button>
          <Button size="sm" variant="secondary" icon={Upload} onClick={() => go('/import')} title="Bulk import via Data Import">Import</Button>
          <Button size="sm" variant="accent" icon={Plus} onClick={() => go('/masters/forex')} title="Add / manage currency exchange rates on the Forex Rates screen">Add Currency</Button>
        </>
      }
      filters={<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or name…" className="w-auto min-w-[220px] flex-1" />}
    >
      <DataTable columns={columns} rows={filtered} getRowKey={(r) => r.code} dense exportName="currencies" printTitle="Currency Master" emptyMessage="No currencies match." />
    </PageLayout>
  );
}

export default CurrencyMaster;
