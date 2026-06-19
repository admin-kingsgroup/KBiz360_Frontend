/* ════════════════════════════════════════════════════════════════════
   Reports ▸ GP Reports — LIVE booking-file gross profit, every which way.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx (the largest report). One live bills array from
   useGpBills, then 11 pure client-side pivots (summary / bill-wise / by
   module-airline-destination-client-supplier-consultant-branch / monthly+
   quarterly / top-10). ALL filter/group/period math is unchanged. The
   grouped + bill + period tabs are now DataTables (sort/sticky/totals/export,
   mobile scroll); the summary chart and top-10 stay as custom panels.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useGpBills } from '../../../core/useAccounting';
import { bc } from '../../../core/styles';
import { exportToExcel } from '../../../core/exportExcel';
import { MODULE_ICONS, CONSOLIDATED_LABEL } from '../../../core/data';
import { CUR_FY, todayISO, monthLabel, rangeNote, presetRange, fyQuarterKey } from '../../../core/dates';
import { periodRange } from '../../../core/period';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, PageSection, Button, Select, Input } from '../../../shell/primitives';

const gpClr = (p) => (p >= 20 ? '#27500A' : p >= 12 ? '#1D9E75' : p >= 8 ? '#854F0B' : '#A32D2D');
const gpBg = (p) => (p >= 12 ? '#EAF3DE' : p >= 8 ? '#FAEEDA' : '#FCEBEB');

const TABS = [
  { k: 'summary', l: '📊 Summary' }, { k: 'bill', l: '🧾 Bill-wise' }, { k: 'module', l: '📦 Module' },
  { k: 'airline', l: '✈ Airline' }, { k: 'destination', l: '🌍 Destination' }, { k: 'client', l: '👥 Client' },
  { k: 'supplier', l: '🏢 Supplier' }, { k: 'consultant', l: '👤 Consultant' }, { k: 'branch', l: '🏦 Branch' },
  { k: 'period', l: '📅 Monthly' }, { k: 'top10', l: '🏆 Top 10' },
];
const MODS = ['All', 'Flight', 'Holiday', 'Hotel', 'Car', 'Visa', 'Insurance', 'Misc'];

export function ReportGP({ branch }) {
  const cur = bc(branch).cur;
  const [tab, setTab] = useState('summary');
  const [search, setSearch] = useState('');
  const [periodMode, setPeriodMode] = useState('cfy');
  const [periodGran, setPeriodGran] = useState('month');
  const [dateFrom, setDateFrom] = useState(CUR_FY.startISO);
  const [dateTo, setDateTo] = useState(todayISO());
  const [modFilter, setModFilter] = useState('All');

  const gpQuery = useGpBills(branch, { from: dateFrom || undefined, to: dateTo || undefined });
  const GP_DATA = gpQuery.data || [];

  const setPeriod = (mode) => {
    setPeriodMode(mode);
    if (mode === 'custom') return;
    if (['today', 'week', 'mtd', 'qtd', 'cfy', 'lfy'].includes(mode)) { const r = periodRange(mode, { branch }); setDateFrom(r.from); setDateTo(r.to); setTab('summary'); return; }
    const r = presetRange(mode); setDateFrom(r.from); setDateTo(r.to);
    if (mode === 'month') { setPeriodGran('month'); setTab('period'); }
    else if (mode === 'quarter') { setPeriodGran('quarter'); setTab('period'); }
    else setTab('summary');
  };
  const onDate = (setter) => (e) => { setter(e.target.value); setPeriodMode('custom'); };

  const bills = useMemo(() => {
    const brCode = branch === 'ALL' ? null : branch?.code;
    const q = search.trim().toLowerCase();
    return GP_DATA
      .filter((b) => ((!brCode || b.branch === brCode) && (!dateFrom || b.date >= dateFrom) && (!dateTo || b.date <= dateTo) && (modFilter === 'All' || b.mod === modFilter) && (!q || [b.id, b.client, b.dest, b.airline, b.supplier].some((x) => String(x || '').toLowerCase().includes(q)))))
      .map((b) => ({ ...b, gp: b.sell - b.cost, gpPct: b.sell > 0 ? +((b.sell - b.cost) / b.sell * 100).toFixed(1) : 0 }));
  }, [GP_DATA, branch, dateFrom, dateTo, modFilter, search]);

  const hasData = !gpQuery.isLoading && !gpQuery.error && bills.length > 0;
  const totSell = bills.reduce((s, b) => s + b.sell, 0);
  const totCost = bills.reduce((s, b) => s + b.cost, 0);
  const totGP = bills.reduce((s, b) => s + b.gp, 0);
  const totGPPct = totSell > 0 ? +(totGP / totSell * 100).toFixed(1) : 0;

  const group = (data, key) => {
    const m = {};
    data.forEach((b) => { const k = b[key] || 'Other'; if (!m[k]) m[k] = { key: k, count: 0, sell: 0, cost: 0, gp: 0 }; m[k].count++; m[k].sell += b.sell; m[k].cost += b.cost; m[k].gp += b.gp; });
    return Object.values(m).map((r) => ({ ...r, gpPct: r.sell > 0 ? +(r.gp / r.sell * 100).toFixed(1) : 0 }));
  };

  const monthly = useMemo(() => {
    const map = new Map();
    bills.forEach((b) => { const k = String(b.date).slice(0, 7); if (!/^\d{4}-\d{2}$/.test(k)) return; if (!map.has(k)) map.set(k, { sell: 0, cost: 0, count: 0 }); const r = map.get(k); r.sell += b.sell; r.cost += b.cost; r.count++; });
    return [...map.keys()].sort().map((k) => { const r = map.get(k), gp = r.sell - r.cost; return { key: k, m: monthLabel(k), sell: r.sell, cost: r.cost, gp, gpPct: r.sell > 0 ? +(gp / r.sell * 100).toFixed(1) : 0, count: r.count }; });
  }, [bills]);

  const quarterly = useMemo(() => {
    const map = new Map();
    bills.forEach((b) => { const k = String(b.date).slice(0, 7); if (!/^\d{4}-\d{2}$/.test(k)) return; const q = fyQuarterKey(k); if (!map.has(q.label)) map.set(q.label, { m: q.label, sort: q.sortKey, sell: 0, cost: 0, count: 0 }); const r = map.get(q.label); r.sell += b.sell; r.cost += b.cost; r.count++; });
    return [...map.values()].sort((a, b) => a.sort - b.sort).map((r) => { const gp = r.sell - r.cost; return { ...r, key: r.m, gp, gpPct: r.sell > 0 ? +(gp / r.sell * 100).toFixed(1) : 0 }; });
  }, [bills]);

  const exportBills = () => exportToExcel(`GP-Report-${dateFrom || 'all'}_to_${dateTo || todayISO()}`,
    [{ key: 'id', label: 'Voucher / File' }, { key: 'date', label: 'Date' }, { key: 'mod', label: 'Module' }, { key: 'client', label: 'Client' }, { key: 'dest', label: 'Destination' }, { key: 'airline', label: 'Airline' }, { key: 'supplier', label: 'Supplier' }, { key: 'consultant', label: 'Consultant' }, { key: 'sell', label: 'Revenue' }, { key: 'cost', label: 'Cost' }, { key: 'gp', label: 'Gross Profit' }, { key: 'gpPct', label: 'GP %' }],
    [...bills].sort((a, b) => b.gp - a.gp));

  const f = (n) => (n >= 10000000 ? (n / 10000000).toFixed(2) + 'Cr' : n >= 100000 ? (n / 100000).toFixed(2) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(Math.round(n)));
  const money = (n) => cur + f(n);
  const pctPill = (p) => <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: gpBg(p), color: gpClr(p) }}>{p}%</span>;

  // ── Shared grouped-table (DataTable) for the 7 dimension tabs ──
  const grpColumns = (nameLbl, icon) => [
    { key: 'key', header: nameLbl, hideable: false, className: 'font-semibold text-navy', render: (r, v) => <span>{icon ? `${icon} ` : ''}{v}</span> },
    { key: 'count', header: 'Bookings', num: true, className: 'text-ink-muted', footer: (rs) => rs.reduce((s, r) => s + r.count, 0) },
    { key: 'sell', header: 'Revenue', num: true, className: 'text-role-hr', render: (r, v) => money(v), footer: (rs) => money(rs.reduce((s, r) => s + r.sell, 0)) },
    { key: 'cost', header: 'Cost', num: true, className: 'text-ink-muted', render: (r, v) => money(v), footer: (rs) => money(rs.reduce((s, r) => s + r.cost, 0)) },
    { key: 'gp', header: 'Gross Profit', num: true, render: (r, v) => <span className="font-bold" style={{ color: gpClr(r.gpPct) }}>{money(v)}</span>, footer: (rs) => money(rs.reduce((s, r) => s + r.gp, 0)) },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => pctPill(v), footer: (rs) => { const s = rs.reduce((a, r) => a + r.sell, 0), g = rs.reduce((a, r) => a + r.gp, 0); return pctPill(s > 0 ? +(g / s * 100).toFixed(1) : 0); } },
  ];
  const GrpTable = ({ data, nameLbl, icon, name }) => (
    <DataTable columns={grpColumns(nameLbl, icon)} rows={data} getRowKey={(r) => r.key} dense initialSort={{ key: 'gp', dir: 'desc' }} exportName={`gp-${name}`} printTitle={`GP by ${nameLbl}`} emptyMessage="No data for this dimension." />
  );

  const billColumns = [
    { key: 'id', header: 'Voucher No.', className: 'font-mono text-[10px] text-[#185FA5]', hideable: false },
    { key: 'date', header: 'Date', className: 'text-ink-muted' },
    { key: 'mod', header: 'Module', render: (r, v) => <span className="rounded-full bg-[#E6F1FB] px-1.5 py-0.5 text-[9.5px] font-bold text-[#185FA5]">{v}</span> },
    { key: 'client', header: 'Client', className: 'font-semibold text-navy' },
    { key: 'dest', header: 'Destination', className: 'text-role-hr' },
    { key: 'airline', header: 'Airline / Supplier', className: 'text-ink-muted', sortValue: (r) => r.airline || r.supplier, render: (r) => r.airline || r.supplier },
    { key: 'consultant', header: 'Consultant', className: 'text-ink-muted' },
    { key: 'sell', header: 'Sell', num: true, className: 'font-semibold text-role-hr', render: (r, v) => money(v), footer: (rs) => money(rs.reduce((s, r) => s + r.sell, 0)) },
    { key: 'cost', header: 'Cost', num: true, className: 'text-ink-muted', render: (r, v) => money(v), footer: (rs) => money(rs.reduce((s, r) => s + r.cost, 0)) },
    { key: 'gp', header: 'GP', num: true, render: (r, v) => <span className="font-bold" style={{ color: gpClr(r.gpPct) }}>{money(v)}</span>, footer: (rs) => money(rs.reduce((s, r) => s + r.gp, 0)) },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => pctPill(v) },
  ];

  // Period rows with vs-prior delta precomputed (chronological order).
  const periodRows = useMemo(() => {
    const rows = periodGran === 'quarter' ? quarterly : monthly;
    return rows.map((m, i) => { const prev = rows[i - 1]; const delta = prev && prev.gpPct > 0 ? +(m.gpPct - prev.gpPct).toFixed(1) : null; return { ...m, delta }; });
  }, [periodGran, quarterly, monthly]);
  const periodColumns = [
    { key: 'm', header: periodGran === 'quarter' ? 'Quarter' : 'Month', hideable: false, className: 'font-bold text-navy' },
    { key: 'count', header: 'Bookings', num: true, className: 'text-ink-muted', footer: () => bills.length },
    { key: 'sell', header: 'Revenue', num: true, render: (r, v) => (v > 0 ? money(v) : '—'), footer: () => money(totSell) },
    { key: 'cost', header: 'Cost', num: true, className: 'text-ink-muted', render: (r, v) => (v > 0 ? money(v) : '—'), footer: () => money(totCost) },
    { key: 'gp', header: 'Gross Profit', num: true, render: (r, v) => (v !== 0 ? <span className="font-bold" style={{ color: gpClr(r.gpPct) }}>{money(v)}</span> : '—'), footer: () => money(totGP) },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => (r.sell > 0 ? pctPill(v) : null), footer: () => pctPill(totGPPct) },
    { key: 'delta', header: 'vs Prior', num: true, render: (r) => (r.delta === null ? <span className="text-ink-subtle">—</span> : <span className="font-bold" style={{ color: r.delta > 0 ? '#27500A' : r.delta < 0 ? '#A32D2D' : '#5a6691' }}>{r.delta > 0 ? '+' + r.delta : r.delta}%</span>) },
  ];

  const KCard = ({ label, value, sub, accent = 'info' }) => {
    const c = { info: '#185FA5', success: '#27500A', warning: '#854F0B', danger: '#A32D2D' }[accent] || '#185FA5';
    return (
      <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: c }}>
        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: c }}>{label}</p>
        <p className="mt-1 text-xl font-extrabold tabular-nums text-navy tablet:text-2xl">{value}</p>
        <p className="text-[10px] text-ink-muted">{sub}</p>
      </div>
    );
  };

  const bestMod = group(bills, 'mod').sort((a, b) => b.gpPct - a.gpPct)[0] || { key: '—', gpPct: 0 };
  const topClient = group(bills, 'client').sort((a, b) => b.gp - a.gp)[0] || { key: '—', gp: 0 };

  const subtitle = gpQuery.isLoading ? 'Loading live books…' : gpQuery.error ? 'Could not load data' : `${bills.length} bookings · ${money(totSell)} revenue · ${totGPPct}% GP`;

  return (
    <PageLayout
      title={`GP Reports — ${branch === 'ALL' ? CONSOLIDATED_LABEL : (branch?.code || '') + (branch?.city ? ' ' + branch.city : '')}`}
      subtitle={subtitle}
      actions={
        <>
          <Button size="sm" variant="secondary" icon={Download} onClick={exportBills}>Export</Button>
          <Button size="sm" variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
        </>
      }
      filters={
        <>
          <Select value={modFilter} onChange={(e) => setModFilter(e.target.value)} className="w-auto">{MODS.map((m) => <option key={m}>{m}</option>)}</Select>
          <Input type="date" value={dateFrom} onChange={onDate(setDateFrom)} className="w-[140px]" />
          <span className="text-xs text-ink-muted">to</span>
          <Input type="date" value={dateTo} onChange={onDate(setDateTo)} className="w-[140px]" />
        </>
      }
    >
      {/* Period presets */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {[{ k: 'all', l: 'All' }, { k: 'today', l: 'Today' }, { k: 'week', l: 'Week' }, { k: 'mtd', l: 'MTD' }, { k: 'qtd', l: 'QTD' }, { k: 'cfy', l: 'CFY' }, { k: 'lfy', l: 'LFY' }, { k: 'month', l: 'Monthly' }, { k: 'quarter', l: 'Quarterly' }, { k: 'custom', l: 'Custom' }].map((p) => (
          <button key={p.k} onClick={() => setPeriod(p.k)} className={`rounded-full border px-3 py-1.5 text-[11px] transition ${periodMode === p.k ? 'border-navy bg-navy font-bold text-gold' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'}`}>{p.l}</button>
        ))}
        <span className="ml-1 text-[10.5px] text-ink-subtle">{periodMode === 'custom' ? rangeNote('range', { from: dateFrom, to: dateTo }) : presetRange(periodMode).label}</span>
      </div>

      {gpQuery.isLoading && <PageSection><p className="py-10 text-center text-sm text-ink-muted">Loading GP data…</p></PageSection>}
      {gpQuery.error && !gpQuery.isLoading && (
        <PageSection><div className="py-10 text-center"><p className="text-sm font-bold text-maroon">Couldn’t load GP data</p><p className="mt-1.5 text-[11px] text-ink-muted">{String(gpQuery.error?.message || gpQuery.error)}</p></div></PageSection>
      )}
      {!gpQuery.isLoading && !gpQuery.error && bills.length === 0 && (
        <PageSection><div className="py-12 text-center"><p className="text-3xl">📊</p><p className="mt-2 text-sm font-bold text-navy">No GP data available for the selected period</p><p className="mt-1.5 text-[11px] text-ink-muted">Try widening the date range, or changing the branch / module filter.</p></div></PageSection>
      )}

      {hasData && (
        <>
          <ResponsiveGrid min="150px" gap="md" className="mb-3">
            <KCard label="Total Revenue" value={money(totSell)} sub={`${bills.length} bookings`} accent="info" />
            <KCard label="Total Cost" value={money(totCost)} sub="Purchase cost total" accent="warning" />
            <KCard label="Gross Profit" value={money(totGP)} sub="Revenue minus cost" accent={totGPPct >= 15 ? 'success' : 'danger'} />
            <KCard label="GP%" value={`${totGPPct}%`} sub="Average gross margin" accent={totGPPct >= 15 ? 'success' : totGPPct >= 10 ? 'warning' : 'danger'} />
            <KCard label="Best Module" value={bestMod.key} sub={`GP ${bestMod.gpPct}%`} accent="success" />
            <KCard label="Top Client" value={`${String(topClient.key).split(' ')[0]}…`} sub={`GP ${money(topClient.gp)}`} accent="info" />
          </ResponsiveGrid>

          {/* Tabs */}
          <div className="mb-3 flex flex-wrap gap-1 rounded-brand bg-surface-alt p-2">
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] transition ${tab === t.k ? 'bg-navy font-bold text-gold' : 'text-ink-muted hover:bg-surface'}`}>{t.l}</button>
            ))}
          </div>

          {tab === 'bill' && (
            <div className="mb-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search voucher no., client, destination, airline…" className="max-w-md" />
            </div>
          )}

          {/* SUMMARY */}
          {tab === 'summary' && (
            <div className="flex flex-col gap-3">
              <PageSection title="Monthly GP Trend">
                <div className="flex items-end gap-2 overflow-x-auto pb-1">
                  {monthly.map((m, i) => {
                    const maxSell = Math.max(...monthly.map((x) => x.sell), 1);
                    const barH = Math.max(4, Math.round(m.sell / maxSell * 120));
                    const gpBarH = m.sell > 0 ? Math.round(m.gp / m.sell * barH) : 0;
                    return (
                      <div key={i} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
                        <p className="text-[9px] font-bold" style={{ color: gpClr(m.gpPct) }}>{m.gpPct}%</p>
                        <div className="flex h-[120px] w-full items-end">
                          <div className="relative w-full overflow-hidden rounded-t bg-[#E6F1FB]" style={{ height: barH }}>
                            <div className="absolute bottom-0 w-full rounded-t bg-[#185FA5]" style={{ height: gpBarH }} />
                          </div>
                        </div>
                        <p className="text-[9px] font-semibold text-ink-muted">{m.m}</p>
                        {m.count > 0 && <p className="text-[8px] text-ink-subtle">{m.count} bkgs</p>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-ink-muted">
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#E6F1FB]" /> Total Revenue</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#185FA5]" /> Gross Profit</span>
                </div>
              </PageSection>
              <p className="text-xs font-bold text-navy">Module-wise Snapshot</p>
              <ResponsiveGrid min="130px" gap="sm">
                {group(bills, 'mod').sort((a, b) => b.gp - a.gp).map((m) => (
                  <div key={m.key} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3 py-2.5" style={{ borderTopColor: gpClr(m.gpPct) }}>
                    <p className="text-[11px] font-bold text-navy">{MODULE_ICONS[m.key] || '📦'} {m.key}</p>
                    <p className="my-0.5 text-base font-extrabold" style={{ color: gpClr(m.gpPct) }}>{m.gpPct}%</p>
                    <p className="text-[9.5px] text-ink-muted">{m.count} bookings · {money(m.gp)}</p>
                  </div>
                ))}
              </ResponsiveGrid>
            </div>
          )}

          {tab === 'bill' && <DataTable columns={billColumns} rows={[...bills].sort((a, b) => b.gp - a.gp)} getRowKey={(r) => r.id} dense initialSort={{ key: 'gp', dir: 'desc' }} exportName="gp-bill-wise" printTitle="GP — Bill-wise" emptyMessage="No bookings match." />}
          {tab === 'module' && <GrpTable data={group(bills, 'mod')} nameLbl="Module" icon="📦" name="module" />}
          {tab === 'airline' && <GrpTable data={group(bills, 'airline').filter((r) => r.key)} nameLbl="Airline" icon="✈" name="airline" />}
          {tab === 'destination' && <GrpTable data={group(bills, 'dest')} nameLbl="Destination" icon="🌍" name="destination" />}
          {tab === 'client' && <GrpTable data={group(bills, 'client')} nameLbl="Client" icon="👥" name="client" />}
          {tab === 'supplier' && <GrpTable data={group(bills, 'supplier')} nameLbl="Supplier" icon="🏢" name="supplier" />}
          {tab === 'consultant' && <GrpTable data={group(bills, 'consultant')} nameLbl="Consultant" icon="👤" name="consultant" />}
          {tab === 'branch' && <GrpTable data={group(bills, 'branch')} nameLbl="Branch" icon="🏦" name="branch" />}

          {tab === 'period' && (
            <div className="flex flex-col gap-2.5">
              <div className="inline-flex gap-1.5">
                {[{ k: 'month', l: '📅 Monthly' }, { k: 'quarter', l: '🗓 Quarterly' }].map((g) => (
                  <button key={g.k} onClick={() => setPeriodGran(g.k)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${periodGran === g.k ? 'bg-navy text-gold' : 'bg-surface-alt text-ink-muted hover:bg-surface-border'}`}>{g.l}</button>
                ))}
              </div>
              <DataTable columns={periodColumns} rows={periodRows} getRowKey={(r) => r.key} dense exportName={`gp-${periodGran}`} printTitle={`GP — ${periodGran === 'quarter' ? 'Quarterly' : 'Monthly'}`} emptyMessage="No data in range." />
            </div>
          )}

          {tab === 'top10' && (
            <ResponsiveGrid cols={2} gap="md">
              {[
                { title: 'Top 10 Clients by GP', data: group(bills, 'client').sort((a, b) => b.gp - a.gp).slice(0, 10), icon: '👥' },
                { title: 'Top 10 Destinations by GP', data: group(bills, 'dest').sort((a, b) => b.gp - a.gp).slice(0, 10), icon: '🌍' },
                { title: 'Top 10 Suppliers by Revenue', data: group(bills, 'supplier').sort((a, b) => b.sell - a.sell).slice(0, 10), icon: '🏢' },
                { title: 'Consultants by GP', data: group(bills, 'consultant').sort((a, b) => b.gp - a.gp), icon: '👤' },
              ].map(({ title, data, icon }) => (
                <div key={title} className="overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
                  <div className="border-b border-navy-light bg-navy px-3.5 py-2.5"><p className="text-xs font-bold text-gold">{title}</p></div>
                  <table className="w-full border-collapse text-[11px]">
                    <thead><tr className="bg-surface-alt text-left text-[10px] font-bold text-ink-muted"><th className="px-3 py-1.5">#</th><th className="px-3 py-1.5">Name</th><th className="px-3 py-1.5 text-right">GP</th><th className="px-3 py-1.5 text-right">GP%</th></tr></thead>
                    <tbody>{data.map((r, i) => (
                      <tr key={r.key} className={`border-b border-surface-alt ${i === 0 ? 'bg-[#f9fff4]' : ''}`}>
                        <td className="px-3 py-1.5 font-bold" style={{ color: i === 0 ? '#d4a437' : '#bfc3d6', fontSize: i === 0 ? 13 : 11 }}>{i === 0 ? '🏆' : i + 1}</td>
                        <td className="truncate px-3 py-1.5 text-navy" style={{ fontWeight: i === 0 ? 700 : 500, maxWidth: 140 }}>{icon} {r.key}</td>
                        <td className="px-3 py-1.5 text-right font-bold tabular-nums" style={{ color: gpClr(r.gpPct) }}>{money(r.gp)}</td>
                        <td className="px-3 py-1.5 text-right">{pctPill(r.gpPct)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ))}
            </ResponsiveGrid>
          )}
        </>
      )}
    </PageLayout>
  );
}

export default ReportGP;
