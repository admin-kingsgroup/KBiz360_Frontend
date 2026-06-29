/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Destination Intelligence — LIVE per-file GP, by destination.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Math unchanged: aggregate useGpBills by
   destination (rev/cost/GP/bookings/top module/avg ticket). Top-6 spotlight
   cards → ResponsiveGrid; the full ranking → DataTable (sort/export/sticky/
   totals/mobile scroll). Search + unified date range preserved.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { useGpBills } from '../../../core/useAccounting';
import { bc } from '../../../core/styles';
import { money } from '../../../core/format';
import { ReportSearch, ReportDateBar, resolveReportRange, matchNeedle } from '../../../core/reportDateBar';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const DEST_EMOJIS = { Dubai: '🇦🇪', Bali: '🇮🇩', Singapore: '🇸🇬', Maldives: '🇲🇻', Bangkok: '🇹🇭', Europe: '🌍', London: '🇬🇧', Paris: '🇫🇷', 'Masai Mara': '🇰🇪', Nairobi: '🇰🇪' };
const gpPctTone = (p) => (p >= 15 ? 'success' : p >= 8 ? 'warning' : 'danger');

export function DestinationIntelligence({ branch }) {
  const cur = bc(branch).cur;
  const f = (n) => money(n, cur);
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const [search, setSearch] = useState('');
  const q = useGpBills(branch, { from: range.from || undefined, to: range.to || undefined });
  const bills = q.data || [];

  const destRows = useMemo(() => {
    const destMap = {};
    bills.forEach((b) => {
      const d = b.dest || 'Other';
      if (!destMap[d]) destMap[d] = { dest: d, rev: 0, cost: 0, bks: 0, mods: {}, months: {} };
      destMap[d].rev += (+b.sell || 0); destMap[d].cost += (+b.cost || 0); destMap[d].bks++;
      destMap[d].mods[b.mod] = (destMap[d].mods[b.mod] || 0) + 1;
      const m = String(b.date || '').slice(0, 7); destMap[d].months[m] = (destMap[d].months[m] || 0) + (+b.sell || 0) - (+b.cost || 0);
    });
    return Object.values(destMap).map((d) => ({
      ...d, gp: d.rev - d.cost, gpPct: d.rev > 0 ? +((d.rev - d.cost) / d.rev * 100).toFixed(1) : 0,
      topMod: Object.entries(d.mods).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
      avgTicket: d.bks > 0 ? Math.round(d.rev / d.bks) : 0,
    })).sort((a, b) => b.gp - a.gp);
  }, [bills]);

  const needle = search.trim().toLowerCase();
  const filtered = useMemo(() => destRows.filter((d) => matchNeedle([d.dest, d.topMod], needle)).map((d, i) => ({ ...d, rank: i + 1 })), [destRows, needle]);
  const maxGP = Math.max(...filtered.map((d) => d.gp), 1);
  const totRev = filtered.reduce((s, d) => s + d.rev, 0);

  const columns = [
    { key: 'rank', header: 'Rank', num: true, sortable: false, hideable: false, render: (r) => <span className={r.rank <= 3 ? 'font-extrabold text-gold-dark' : 'text-ink-muted'}>{r.rank}</span> },
    { key: 'dest', header: 'Destination', className: 'font-semibold text-navy', hideable: false, render: (r, v) => `${DEST_EMOJIS[v] || '🌍'} ${v}` },
    { key: 'bks', header: 'Bookings', num: true, footer: (rs) => rs.reduce((s, r) => s + r.bks, 0) },
    { key: 'rev', header: 'Revenue', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.rev, 0)) },
    { key: 'cost', header: 'Cost', num: true, className: 'text-maroon', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.cost, 0)) },
    { key: 'gp', header: 'Gross Profit', num: true, className: 'font-bold text-[#16a34a]', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.gp, 0)) },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => <StatusPill tone={gpPctTone(v)} size="sm">{v}%</StatusPill> },
    { key: 'avgTicket', header: 'Avg Ticket', num: true, className: 'text-role-hr', render: (r, v) => f(v) },
    { key: 'share', header: 'Rev Share', num: true, sortValue: (r) => r.rev, render: (r) => `${totRev > 0 ? Math.round(r.rev / totRev * 100) : 0}%` },
  ];

  const filters = (
    <>
      <ReportSearch value={search} onChange={setSearch} placeholder="Destination / module…" />
      <ReportDateBar value={range} onChange={setRange} branch={branch} />
    </>
  );

  return (
    <RptShell title="Destination Intelligence" subtitle={`${filtered.length} destinations · ${bills.length} bookings · Revenue & GP breakdown`} filters={filters}>
      {/* Spotlight cards — top 6 by GP */}
      <ResponsiveGrid min="280px" gap="md" className="mb-4">
        {filtered.slice(0, 6).map((d, i) => (
          <div key={d.dest} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: i < 3 ? '#c2a04a' : '#e6e8ec' }}>
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">{DEST_EMOJIS[d.dest] || '🌍'}</span>
                <div>
                  <p className="text-[13px] font-bold text-navy">{d.dest}</p>
                  <p className="mt-px text-[9.5px] text-ink-muted">{d.bks} bookings · Top: {d.topMod}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-[#16a34a]">{f(d.gp)}</p>
                <p className={`mt-px text-[9.5px] ${d.gpPct >= 12 ? 'text-[#16a34a]' : 'text-[#d97706]'}`}>GP {d.gpPct}%</p>
              </div>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-border">
              <div className="h-full rounded-full" style={{ width: `${Math.round(d.gp / maxGP * 100)}%`, background: i < 3 ? '#c2a04a' : '#16a34a' }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-surface-alt px-2 py-1.5 text-center">
                <p className="text-[8.5px] text-ink-muted">Revenue</p>
                <p className="mt-px text-[11px] font-bold text-[#2563eb]">{f(d.rev)}</p>
              </div>
              <div className="rounded-md bg-surface-alt px-2 py-1.5 text-center">
                <p className="text-[8.5px] text-ink-muted">Avg Ticket</p>
                <p className="mt-px text-[11px] font-bold text-role-hr">{f(d.avgTicket)}</p>
              </div>
            </div>
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable
        loading={q.isLoading}
        isError={q.isError}
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.dest}
        dense
        title="All Destinations — Revenue & Profitability Ranking"
        showColumnToggle
        initialSort={{ key: 'gp', dir: 'desc' }}
        exportName="destination-intelligence"
        printTitle="Destination Intelligence"
        emptyMessage={needle ? `No destination matches “${search}”.` : 'No bookings in this date range.'}
        emptyHint={needle ? undefined : 'Widen the range (try “All”) or post sale vouchers for this branch.'}
      />
    </RptShell>
  );
}

export default DestinationIntelligence;
