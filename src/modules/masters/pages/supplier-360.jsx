/* ════════════════════════════════════════════════════════════════════
   Reports/Masters ▸ Supplier 360° View — LIVE supplier profile.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Live supplier purchases (useGpBills, branch +
   date scoped) + ADM/ACM lookups — all aggregation/search logic unchanged.
   The navy profile card keeps its custom gradient; purchase history →
   DataTable; ADM/ACM lists → PageSection panels.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { bc } from '../../../core/styles';
import { useGpBills } from '../../../core/useAccounting';
import { ADM_DATA } from '../../../core/data';
import { ACM_DATA } from '../../../core/helpers';
import { ReportSearch, ReportDateBar, resolveReportRange, matchNeedle } from '../../../core/reportDateBar';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Select, PageSection } from '../../../shell/primitives';

export function Supplier360({ branch }) {
  const cur = bc(branch).cur;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const gpQ = useGpBills(branch, { from: range.from || undefined, to: range.to || undefined });
  const BILLS = gpQ.data || [];

  const ALL_SUPPLIERS = [...new Set(BILLS.filter((b) => b.supplier).map((b) => b.supplier))].sort((a, b) => a.localeCompare(b));
  const [supplier, setSupplier] = useState('');
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const selSupplier = (supplier && ALL_SUPPLIERS.includes(supplier)) ? supplier : (ALL_SUPPLIERS[0] || '');

  const suppBills = BILLS.filter((b) => b.supplier === selSupplier);
  const totCost = suppBills.reduce((s, b) => s + b.cost, 0);
  const totRev = suppBills.reduce((s, b) => s + b.sell, 0);
  const totGP = totRev - totCost;
  const gpPct = totRev > 0 ? +(totGP / totRev * 100).toFixed(1) : 0;
  const outstanding = Math.round(totCost * 0.20);
  const mods = [...new Set(suppBills.map((b) => b.mod).filter(Boolean))];
  const branches = [...new Set(suppBills.map((b) => b.branch).filter(Boolean))];
  const histBills = suppBills.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const filteredHist = histBills.filter((b) => matchNeedle([b.id, b.date, b.mod, b.dest], needle));
  const displayHist = (needle ? filteredHist : filteredHist.slice(0, 10)).map((b) => ({ ...b, gp: b.sell - b.cost, gpPct: b.sell > 0 ? +((b.sell - b.cost) / b.sell * 100).toFixed(1) : 0 }));

  const suppADMs = ADM_DATA.filter((a) => selSupplier && (a.airline === selSupplier || a.airline.includes(selSupplier.split(' ')[0])));
  const suppACMs = ACM_DATA.filter((a) => selSupplier && (a.airline === selSupplier || a.airline.includes(selSupplier.split(' ')[0])));
  const f = (n) => cur + Number(Math.round(n)).toLocaleString('en-IN');

  const profileKpis = [
    { l: 'Total Purchases', v: f(totCost) }, { l: 'GP Generated', v: f(totGP) }, { l: 'Avg GP%', v: `${gpPct}%` },
    { l: 'Bookings', v: String(suppBills.length) }, { l: 'Outstanding Payable', v: f(outstanding) }, { l: 'ADMs Raised', v: String(suppADMs.length) },
  ];

  const histColumns = [
    { key: 'id', header: 'Voucher No.', className: 'font-mono text-[9.5px] text-[#2563eb]', hideable: false },
    { key: 'date', header: 'Date', className: 'text-ink-muted' },
    { key: 'mod', header: 'Module', render: (r, v) => <span className="rounded-full bg-[#e8f0ff] px-1.5 py-0.5 text-[9.5px] font-bold text-[#2563eb]">{v}</span> },
    { key: 'dest', header: 'Destination', className: 'text-role-hr', render: (r, v) => v || '—' },
    { key: 'cost', header: 'Cost', num: true, render: (r, v) => f(v) },
    { key: 'gp', header: 'GP', num: true, render: (r, v) => <span className="font-semibold" style={{ color: v > 0 ? '#16a34a' : '#dc2626' }}>{f(v)}</span> },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold" style={{ background: v >= 12 ? '#e8f6ed' : '#fbeedb', color: v >= 12 ? '#16a34a' : '#d97706' }}>{v}%</span> },
  ];

  const MemoRow = ({ a, gain }) => (
    <div className="flex justify-between border-b border-surface-alt py-1.5 text-[10.5px]">
      <div><p className="font-mono text-[9.5px]" style={{ color: gain ? '#16a34a' : '#dc2626' }}>{a.id}</p><p className="text-[9px] text-ink-muted">{a.reasonCode} — {a.date}</p></div>
      <div className="text-right"><p className="font-bold" style={{ color: gain ? '#16a34a' : '#dc2626' }}>{gain ? '+' : ''}{a.currency}{a.amount.toLocaleString()}</p><span className="rounded-full px-1.5 py-px text-[9px] font-bold" style={{ background: gain ? '#e8f6ed' : '#fbe9e9', color: gain ? '#16a34a' : '#dc2626' }}>{a.status}</span></div>
    </div>
  );

  return (
    <PageLayout
      title="Supplier 360° View"
      subtitle="Complete supplier profile — purchases, outstanding, ADMs, ACMs, performance"
      filters={
        <>
          <ReportSearch value={search} onChange={setSearch} placeholder="Voucher / module / destination…" />
          <ReportDateBar value={range} onChange={setRange} branch={branch} />
          <Select value={selSupplier} onChange={(e) => setSupplier(e.target.value)} disabled={!ALL_SUPPLIERS.length} className="w-auto min-w-[200px]">
            {ALL_SUPPLIERS.length ? ALL_SUPPLIERS.map((s) => <option key={s}>{s}</option>) : <option value="">No supplier data yet</option>}
          </Select>
        </>
      }
    >
      {gpQ.isError && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-brand border border-[#E8B4B4] bg-[#fbe9e9] px-4 py-3">
          <span className="text-lg leading-none">⚠️</span>
          <div><p className="text-xs font-bold text-navy">Couldn’t load supplier purchases</p><p className="mt-0.5 text-[11px] text-maroon">{gpQ.error?.message || 'Request failed.'} — check you’re signed in and the ERP API is reachable.</p></div>
        </div>
      )}
      {!gpQ.isError && !gpQ.isLoading && ALL_SUPPLIERS.length === 0 && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-brand border border-[#F0D98A] bg-[#FFF8E8] px-4 py-3">
          <span className="text-lg leading-none">ℹ️</span>
          <div><p className="text-xs font-bold text-navy">No supplier purchases for {brCode || 'this branch'}{range.mode !== 'all' ? ' in this period' : ''}</p><p className="mt-0.5 text-[11px] text-ink-muted">This view aggregates supplier purchases from posted bills. Widen the date range (try “All”) or bill some purchase vouchers.</p></div>
        </div>
      )}
      {gpQ.isLoading && <div className="mb-3.5 rounded-brand border border-surface-border bg-surface px-4 py-6 text-center text-xs text-ink-muted">Loading supplier purchases…</div>}

      {/* Profile card — navy gradient */}
      <div className="mb-3.5 rounded-brand p-4" style={{ background: 'linear-gradient(135deg,#1a1c22,#2563eb)' }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
          {profileKpis.map((k, i) => (
            <div key={i} className="rounded-lg px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[9px] font-bold uppercase text-white/60">{k.l}</p>
              <p className="mt-1 text-xl font-extrabold text-white">{k.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-[10px] text-white/60">Modules:</p>
          {mods.map((m) => <span key={m} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">{m}</span>)}
          <p className="ml-3 text-[10px] text-white/60">Branches:</p>
          {branches.map((b) => <span key={b} className="rounded-full px-2 py-0.5 text-[10px] font-bold text-gold" style={{ background: 'rgba(212,164,55,0.3)' }}>{b}</span>)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 desktop:grid-cols-[2fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-bold text-navy">Purchase History ({needle ? filteredHist.length : suppBills.length} bookings)</p>
          <DataTable columns={histColumns} rows={displayHist} loading={gpQ.isLoading} isError={gpQ.isError} getRowKey={(r) => r.id} dense exportName={`supplier-${selSupplier || 'none'}`} emptyMessage="No purchases for this supplier." />
        </div>
        <div className="flex flex-col gap-3">
          <PageSection title={`ADMs (${suppADMs.length})`} className="border-t-[3px] border-t-maroon">
            {suppADMs.length === 0 ? <p className="text-[11px] text-ink-muted">No ADMs from this supplier</p> : suppADMs.map((a) => <MemoRow key={a.id} a={a} gain={false} />)}
          </PageSection>
          <PageSection title={`ACMs (${suppACMs.length})`} className="border-t-[3px] border-t-[#16a34a]">
            {suppACMs.length === 0 ? <p className="text-[11px] text-ink-muted">No ACMs from this supplier</p> : suppACMs.map((a) => <MemoRow key={a.id} a={a} gain />)}
          </PageSection>
        </div>
      </div>
    </PageLayout>
  );
}

export default Supplier360;
