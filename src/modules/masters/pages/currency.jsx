/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Currency Master — currencies + INR exchange rates.
   ════════════════════════════════════════════════════════════════════
   PageLayout + DataTable (sort/sticky/export/mobile scroll). Currencies come
   from /api/app-config/currencies; the displayed "1 unit = ₹" rate is read from
   the SAME forex-rates store that the Forex Rates screen (/masters/forex) writes,
   so the number shown here matches what "Edit Rate" edits — with the app-config
   reference rate (currencyMeta.toINR) as a fallback when no forex row exists yet.
   The Rate Source column makes that provenance explicit (Forex live vs Reference).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo } from 'react';
import { RefreshCw, Upload, Plus } from 'lucide-react';
import { useCurrencies, useForexLatest } from '../../../core/useReference';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Button, StatusPill } from '../../../shell/primitives';

export function CurrencyMaster({ setRoute }) {
  const [search, setSearch] = useState('');
  // Currency metadata { INR:{symbol,name,toINR}, ... } (read-only) + the latest forex
  // rows (the operational X→INR rates maintained on the Forex Rates screen).
  const curQ = useCurrencies();
  const fxQ = useForexLatest();
  const meta = curQ.data;
  const go = (r) => setRoute && setRoute(r);
  // Latest X→INR per currency from the forex-rates store. A direct X→INR row wins; if
  // only INR→X is stored, use its reciprocal so one row serves both directions.
  const fxByCode = useMemo(() => {
    const out = {};
    for (const r of (fxQ.data || [])) {
      const from = String(r.from || '').toUpperCase();
      const to = String(r.to || '').toUpperCase();
      const rate = Number(r.rate) || 0;
      if (rate <= 0) continue;
      if (to === 'INR') out[from] = { rate, date: r.date, source: r.source };
      else if (from === 'INR' && !out[to]) out[to] = { rate: 1 / rate, date: r.date, source: `${r.source || 'Manual'} (inv)` };
    }
    return out;
  }, [fxQ.data]);
  const rows = useMemo(() => Object.entries(meta || {}).map(([code, m]) => {
    const isBase = code === 'INR';
    const fx = isBase ? null : fxByCode[code];
    return {
      code,
      name: m?.name || code,
      symbol: m?.symbol || '',
      dailyRate: isBase ? 1 : (fx ? fx.rate : Number(m?.toINR) || 0),
      rateSource: isBase ? '' : (fx ? 'Forex' : 'Reference'),
      isBase,
      lastUpdated: (fx && fx.date) || m?.updatedAt || '',
      active: m?.active !== false,
    };
  }), [meta, fxByCode]);
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
    { key: 'rateSource', header: 'Rate Source', align: 'center', className: 'text-[10.5px] text-ink-muted', render: (r, v) => v ? <span title={v === 'Forex' ? 'Latest rate from the Forex Rates screen' : 'App-config reference rate — no forex row entered yet'}>{v === 'Forex' ? 'Forex (live)' : 'Reference'}</span> : '—' },
    { key: 'lastUpdated', header: 'Last Updated', className: 'text-ink-muted', render: (r, v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN'); } },
    { key: 'active', header: 'Status', align: 'center', render: (r, v) => <StatusPill tone={v ? 'success' : 'danger'} size="sm">{v ? 'Active' : 'Inactive'}</StatusPill> },
    { key: '__act', header: 'Action', align: 'center', sortable: false, exportable: false, hideable: false, render: (r) => <Button variant="secondary" size="xs" onClick={() => go('/masters/forex')} title={`Manage the ${r.code} exchange rate on the Forex Rates screen`} disabled={r.isBase}>Edit Rate</Button> },
  ];

  return (
    <PageLayout
      title="Currency Master"
      subtitle="All currencies used by Travkings — exchange rates are maintained on the Forex Rates screen"
      actions={
        <>
          <Button size="sm" variant="secondary" icon={RefreshCw} className="border-gold text-gold-dark" loading={curQ.isFetching || fxQ.isFetching} onClick={() => { curQ.refetch(); fxQ.refetch(); }} title="Re-pull the latest currencies + exchange rates from the server">Refresh Rates</Button>
          <Button size="sm" variant="secondary" icon={Upload} onClick={() => go('/import')} title="Bulk import via Data Import">Import</Button>
          <Button size="sm" variant="accent" icon={Plus} onClick={() => go('/masters/forex')} title="Add / manage currency exchange rates on the Forex Rates screen">Add Currency</Button>
        </>
      }
      filters={<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or name…" className="w-auto min-w-[220px] flex-1" />}
    >
      <DataTable columns={columns} rows={filtered} getRowKey={(r) => r.code} dense loading={curQ.isLoading} isError={curQ.isError} error={curQ.error} onRetry={() => { curQ.refetch(); fxQ.refetch(); }} exportName="currencies" printTitle="Currency Master" emptyMessage="No currencies match." />
    </PageLayout>
  );
}

export default CurrencyMaster;
