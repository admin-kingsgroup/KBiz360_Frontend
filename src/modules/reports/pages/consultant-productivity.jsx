/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Consultant Productivity — LIVE per-file GP, by consultant.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx onto the shared scaffold. Math is unchanged
   (per-consultant rev/cost/GP from useGpBills, YoY from the same window
   shifted 12 months, 3-month trend). Table view → DataTable (sort, sticky
   header, totals footer, Excel + CSV export, mobile horizontal scroll);
   KPIs → ResponsiveGrid; trend view → PageSection bars.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { Download, BarChart3, LineChart } from 'lucide-react';
import { useGpBills } from '../../../core/useAccounting';
import { exportToCSV } from '../../../core/business-logic';
import { bc } from '../../../core/styles';
import { money } from '../../../core/format';
import { ReportSearch, ReportDateBar, resolveReportRange, priorYearRange, matchNeedle } from '../../../core/reportDateBar';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, ResponsiveGrid, StatusPill, Button } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const MOD_CLR = { Flight: '#378ADD', Holiday: '#3fb7a3', Hotel: '#BA7517', Visa: '#D4537E', Car: '#7F77DD', Insurance: '#5F9EA0', Misc: '#888' };
const gpPctTone = (p) => (p >= 15 ? 'success' : p >= 8 ? 'warning' : 'danger');

export function ConsultantReport({ branch }) {
  const cur = bc(branch).cur;
  const f = (n) => money(n, cur);
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const [view, setView] = useState('table'); // table | trend
  const [search, setSearch] = useState('');

  const q = useGpBills(branch, { from: range.from || undefined, to: range.to || undefined });
  const bills = q.data || [];

  // Year-over-year: same window shifted exactly 12 months back.
  const prevRange = priorYearRange(range);
  const qPrev = useGpBills(branch, { from: prevRange.from || undefined, to: prevRange.to || undefined });
  const billsPrev = qPrev.data || [];

  const stats = useMemo(() => {
    const m = {};
    bills.forEach((b) => {
      if (!m[b.consultant]) m[b.consultant] = { name: b.consultant, rev: 0, cost: 0, bks: 0, mods: {} };
      m[b.consultant].rev += b.sell; m[b.consultant].cost += b.cost; m[b.consultant].bks++;
      m[b.consultant].mods[b.mod] = (m[b.consultant].mods[b.mod] || 0) + 1;
    });
    return Object.values(m).map((c) => ({
      ...c,
      gp: c.rev - c.cost,
      gpPct: c.rev > 0 ? +((c.rev - c.cost) / c.rev * 100).toFixed(1) : 0,
      avgTicket: c.bks > 0 ? Math.round(c.rev / c.bks) : 0,
      topMod: Object.entries(c.mods).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
    })).sort((a, b) => b.gp - a.gp);
  }, [bills]);

  const prevMap = useMemo(() => {
    const m = {};
    billsPrev.forEach((b) => { if (!m[b.consultant]) m[b.consultant] = { rev: 0, gp: 0, bks: 0 }; m[b.consultant].rev += b.sell; m[b.consultant].gp += b.sell - b.cost; m[b.consultant].bks++; });
    return m;
  }, [billsPrev]);

  const trendData = useMemo(() => {
    const months = [...new Set(bills.map((b) => String(b.date || '').slice(0, 7)).filter(Boolean))].sort().slice(-3);
    const consults = [...new Set(bills.map((b) => b.consultant).filter(Boolean))];
    return consults.slice(0, 5).map((name) => ({
      name,
      data: months.map((m) => { const mb = bills.filter((b) => b.consultant === name && String(b.date || '').startsWith(m)); return { m, gp: mb.reduce((s, b) => s + b.sell - b.cost, 0), bks: mb.length }; }),
    }));
  }, [bills]);

  const needle = search.trim().toLowerCase();
  // Rank reflects GP order; attach YoY delta. Then filter by the search needle.
  const ranked = useMemo(
    () => stats.map((c, i) => ({ ...c, rank: i + 1, gpDelta: prevMap[c.name] ? c.gp - prevMap[c.name].gp : null })),
    [stats, prevMap],
  );
  const filtered = useMemo(() => ranked.filter((c) => matchNeedle([c.name, c.topMod], needle)), [ranked, needle]);

  const totRev = filtered.reduce((s, c) => s + c.rev, 0);
  const totGP = filtered.reduce((s, c) => s + c.gp, 0);
  const totBks = filtered.reduce((s, c) => s + c.bks, 0);

  const KPIS = [
    { l: 'Consultants', v: String(filtered.length), c: '#2e323c' },
    { l: 'Total Revenue', v: f(totRev), c: '#2563eb' },
    { l: 'Total GP', v: f(totGP), c: '#16a34a' },
    { l: 'Avg GP/Consultant', v: filtered.length > 0 ? f(Math.round(totGP / filtered.length)) : '—', c: '#3fb7a3' },
    { l: 'Avg Ticket Value', v: totBks > 0 ? f(Math.round(totRev / totBks)) : '—', c: '#d97706' },
    { l: 'Total Bookings', v: String(totBks), c: '#2e323c' },
  ];

  const columns = [
    { key: 'rank', header: 'Rank', align: 'center', sortable: false, hideable: false, render: (r) => (r.rank <= 3 ? <span className="text-base">⭐</span> : r.rank), footerLabel: 'TOTAL' },
    { key: 'name', header: 'Consultant', className: 'font-bold text-navy', hideable: false },
    { key: 'rev', header: 'Revenue', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.rev, 0)) },
    { key: 'cost', header: 'Cost', num: true, className: 'text-maroon', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.cost, 0)) },
    { key: 'gp', header: 'Gross Profit', num: true, className: 'font-bold text-[#16a34a]', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.gp, 0)) },
    { key: 'gpPct', header: 'GP%', num: true, render: (r, v) => <StatusPill tone={gpPctTone(v)} size="sm">{v}%</StatusPill>, footer: (rs) => { const tr = rs.reduce((s, r) => s + r.rev, 0); const tg = rs.reduce((s, r) => s + r.gp, 0); return tr > 0 ? +(tg / tr * 100).toFixed(1) + '%' : '0%'; } },
    { key: 'bks', header: 'Bookings', num: true, footer: (rs) => rs.reduce((s, r) => s + r.bks, 0) },
    { key: 'avgTicket', header: 'Avg Ticket', num: true, className: 'text-role-hr', render: (r, v) => f(v) },
    { key: 'topMod', header: 'Top Module', render: (r, v) => <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (MOD_CLR[v] || '#2e323c') + '22', color: MOD_CLR[v] || '#2e323c' }}>{v}</span> },
    { key: 'gpDelta', header: 'vs 1 Yr Ago', num: true, render: (r, v) => (v == null ? <span className="text-ink-subtle">—</span> : <span className={`font-bold ${v >= 0 ? 'text-[#16a34a]' : 'text-maroon'}`}>{v >= 0 ? '+' : ''}{f(v)}</span>) },
  ];

  const filters = (
    <>
      <ReportSearch value={search} onChange={setSearch} placeholder="Consultant / module…" />
      <ReportDateBar value={range} onChange={setRange} branch={branch} />
      <div className="inline-flex overflow-hidden rounded-md border border-surface-border">
        <button onClick={() => setView('table')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${view === 'table' ? 'bg-navy text-white' : 'bg-surface text-ink-muted hover:bg-surface-alt'}`}><BarChart3 size={13} /> Table</button>
        <button onClick={() => setView('trend')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${view === 'trend' ? 'bg-navy text-white' : 'bg-surface text-ink-muted hover:bg-surface-alt'}`}><LineChart size={13} /> Trend</button>
      </div>
    </>
  );

  return (
    <RptShell title="Consultant Productivity" subtitle={`${filtered.length} consultants · ${totBks} bookings · Total GP ${f(totGP)}`} filters={filters}>
      <ResponsiveGrid min="150px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-navy tablet:text-xl">{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>

      {view === 'table' ? (
        <DataTable
          loading={q.isLoading}
          isError={q.isError}
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.name}
          dense
          showColumnToggle
          initialSort={{ key: 'gp', dir: 'desc' }}
          exportName="consultant-productivity"
          printTitle="Consultant Productivity"
          emptyMessage={needle ? `No consultant matches “${search}”.` : 'No bookings in this date range.'}
          emptyHint={needle ? undefined : 'Widen the range (try “All”) or check that sale vouchers are posted for this branch.'}
          toolbar={<Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCSV(stats, ['name', 'rev', 'cost', 'gp', 'gpPct', 'bks', 'avgTicket', 'topMod'], 'consultants.csv')}>CSV</Button>}
        />
      ) : (
        <PageSection title="GP Trend — recent months (Top 5 Consultants)">
          {trendData.filter((c) => matchNeedle([c.name], needle)).map((c, ci) => (
            <div key={c.name} className="mb-4 last:mb-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-navy">{c.name}</span>
                <span className="text-[10.5px] text-ink-muted">{c.data.reduce((s, d) => s + d.bks, 0)} bookings total</span>
              </div>
              <div className="flex gap-1.5">
                {c.data.map((d) => {
                  const maxGP = Math.max(...trendData.flatMap((x) => x.data).map((x) => x.gp), 1);
                  const h = Math.round(d.gp / maxGP * 60);
                  return (
                    <div key={d.m} className="flex-1 text-center">
                      <div className="mb-0.5 flex h-16 items-end justify-center">
                        <div className="w-[60%] rounded-t" style={{ height: Math.max(h, 2), background: ['#2563eb', '#16a34a', '#d97706'][ci % 3] || '#2e323c' }} />
                      </div>
                      <p className="text-[8.5px] text-ink-muted">{d.m.slice(5)}</p>
                      <p className="text-[9.5px] font-bold text-navy">₹{Math.round(d.gp / 1000)}K</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {trendData.length === 0 && <p className="py-4 text-center text-xs text-ink-muted">No trend data for this range.</p>}
        </PageSection>
      )}
    </RptShell>
  );
}

export default ConsultantReport;
