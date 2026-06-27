/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Customer 360° View — LIVE customer profile.
   ════════════════════════════════════════════════════════════════════
   The receivables mirror of Supplier 360: live sales (useGpBills, branch +
   date scoped) for the profile + history, and the REAL receivable outstanding
   pulled from the ageing endpoint (no estimate). Supports ?party= deep-linking
   from the Receivables / Collections rows.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { bc } from '../../../core/styles';
import { useGpBills, useAgeing } from '../../../core/useAccounting';
import { ReportSearch, ReportDateBar, resolveReportRange, matchNeedle } from '../../../core/reportDateBar';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Select, PageSection } from '../../../shell/primitives';

const AGE_BUCKETS = [['d0', '0–30'], ['d30', '31–60'], ['d60', '61–90'], ['d90', '90+']];

export function Customer360({ branch }) {
  const cur = bc(branch).cur;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const gpQ = useGpBills(branch, { from: range.from || undefined, to: range.to || undefined });
  const ageQ = useAgeing(branch);
  const BILLS = gpQ.data || [];

  const ALL_CLIENTS = [...new Set(BILLS.filter((b) => b.client).map((b) => b.client))].sort((a, b) => a.localeCompare(b));
  // Deep-link a customer via ?party= (the "360°" drill from a Receivables row).
  const [client, setClient] = useState(() => { try { return new URLSearchParams(window.location.search).get('party') || ''; } catch { return ''; } });
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const selClient = (client && ALL_CLIENTS.includes(client)) ? client : (ALL_CLIENTS[0] || '');

  const clientBills = BILLS.filter((b) => b.client === selClient);
  const totRev = clientBills.reduce((s, b) => s + b.sell, 0);
  const totCost = clientBills.reduce((s, b) => s + b.cost, 0);
  const totGP = totRev - totCost;
  const gpPct = totRev > 0 ? +(totGP / totRev * 100).toFixed(1) : 0;
  const mods = [...new Set(clientBills.map((b) => b.mod).filter(Boolean))];
  const branches = [...new Set(clientBills.map((b) => b.branch).filter(Boolean))];

  // REAL receivable outstanding for this customer from the ageing endpoint.
  const ageRow = (ageQ.data?.receivables?.rows || []).find((r) => r.party === selClient) || {};
  const outstanding = ageRow.net != null ? ageRow.net : (ageRow.total || 0);

  const histBills = clientBills.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const filteredHist = histBills.filter((b) => matchNeedle([b.id, b.date, b.mod, b.dest], needle));
  const displayHist = (needle ? filteredHist : filteredHist.slice(0, 10)).map((b) => ({ ...b, gp: b.sell - b.cost, gpPct: b.sell > 0 ? +((b.sell - b.cost) / b.sell * 100).toFixed(1) : 0 }));
  const f = (n) => cur + Number(Math.round(n)).toLocaleString('en-IN');

  const profileKpis = [
    { l: 'Total Sales', v: f(totRev) }, { l: 'GP Generated', v: f(totGP) }, { l: 'Avg GP%', v: `${gpPct}%` },
    { l: 'Bookings', v: String(clientBills.length) }, { l: 'Outstanding Receivable', v: f(outstanding) }, { l: 'Branches', v: String(branches.length) },
  ];

  const histColumns = [
    { key: 'id', header: 'Voucher No.', className: 'font-mono text-[9.5px] text-[#185FA5]', hideable: false },
    { key: 'date', header: 'Date', className: 'text-ink-muted' },
    { key: 'mod', header: 'Module', render: (r, v) => <span className="rounded-full bg-[#E6F1FB] px-1.5 py-0.5 text-[9.5px] font-bold text-[#185FA5]">{v}</span> },
    { key: 'dest', header: 'Destination', className: 'text-role-hr', render: (r, v) => v || '—' },
    { key: 'sell', header: 'Sale', num: true, render: (r, v) => f(v) },
    { key: 'gp', header: 'GP', num: true, render: (r, v) => <span className="font-semibold" style={{ color: v > 0 ? '#27500A' : '#A32D2D' }}>{f(v)}</span> },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold" style={{ background: v >= 12 ? '#EAF3DE' : '#FAEEDA', color: v >= 12 ? '#27500A' : '#854F0B' }}>{v}%</span> },
  ];

  return (
    <PageLayout
      title="Customer 360° View"
      subtitle="Complete customer profile — sales, GP, outstanding receivable and ageing"
      filters={
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1"><ReportSearch value={search} onChange={setSearch} placeholder="Voucher / module / destination…" width="100%" /></div>
            <Select value={selClient} onChange={(e) => setClient(e.target.value)} disabled={!ALL_CLIENTS.length} className="flex-1">
              {ALL_CLIENTS.length ? ALL_CLIENTS.map((s) => <option key={s}>{s}</option>) : <option value="">No customer data yet</option>}
            </Select>
          </div>
          <ReportDateBar value={range} onChange={setRange} branch={branch} />
        </div>
      }
    >
      {gpQ.isError && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-brand border border-[#E8B4B4] bg-[#FCEBEB] px-4 py-3">
          <span className="text-lg leading-none">⚠️</span>
          <div><p className="text-xs font-bold text-navy">Couldn’t load customer sales</p><p className="mt-0.5 text-[11px] text-maroon">{gpQ.error?.message || 'Request failed.'} — check you’re signed in and the ERP API is reachable.</p></div>
        </div>
      )}
      {!gpQ.isError && !gpQ.isLoading && ALL_CLIENTS.length === 0 && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-brand border border-[#F0D98A] bg-[#FFF8E8] px-4 py-3">
          <span className="text-lg leading-none">ℹ️</span>
          <div><p className="text-xs font-bold text-navy">No customer sales for {brCode || 'this branch'}{range.mode !== 'all' ? ' in this period' : ''}</p><p className="mt-0.5 text-[11px] text-ink-muted">This view aggregates customer sales from posted bills. Widen the date range (try “All”) or bill some sale vouchers.</p></div>
        </div>
      )}
      {gpQ.isLoading && <div className="mb-3.5 rounded-brand border border-surface-border bg-surface px-4 py-6 text-center text-xs text-ink-muted">Loading customer sales…</div>}

      {/* Profile card — navy gradient */}
      <div className="mb-3.5 rounded-brand p-4" style={{ background: 'linear-gradient(135deg,#0d1326,#185FA5)' }}>
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
          <p className="mb-2 text-xs font-bold text-navy">Sales History ({needle ? filteredHist.length : clientBills.length} bookings)</p>
          <DataTable columns={histColumns} rows={displayHist} getRowKey={(r) => r.id} dense exportName={`customer-${selClient || 'none'}`} emptyMessage="No sales for this customer." />
        </div>
        <div className="flex flex-col gap-3">
          <PageSection title="Receivable Ageing" className="border-t-[3px] border-t-[#185FA5] mt-6">
            {!ageRow.party ? <p className="text-[11px] text-ink-muted">No open receivable for this customer.</p> : (
              <div className="text-[11px]">
                {AGE_BUCKETS.map(([k, lbl]) => (
                  <div key={k} className="flex justify-between border-b border-surface-alt py-1.5">
                    <span className="text-ink-muted">{lbl} days</span>
                    <span className="font-bold tabular-nums" style={{ color: k === 'd90' && ageRow[k] > 0 ? '#A32D2D' : '#0d1326' }}>{ageRow[k] ? f(ageRow[k]) : '—'}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-navy">Net Outstanding</span>
                  <span className="font-extrabold tabular-nums text-navy">{f(outstanding)}</span>
                </div>
              </div>
            )}
          </PageSection>
        </div>
      </div>
    </PageLayout>
  );
}

export default Customer360;
