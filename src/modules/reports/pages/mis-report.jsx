/* ════════════════════════════════════════════════════════════════════
   Reports ▸ MIS (Management Information System) — the Monday Morning Report.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. All KPI / trend / leaderboard / ageing math is
   unchanged (live booking-file GP from useGpBills, expenses from Module P&L,
   overdue from AR ageing). A multi-panel dashboard, so panels become
   PageSection cards in a ResponsiveGrid; KPIs use brand status pills; the
   trend chart keeps its custom CSS bars. Uses PageLayout for the period +
   print actions.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useGpBills, useModulePL, useAgeing } from '../../../core/useAccounting';
import { bc } from '../../../core/styles';
import { CUR_MONTH, MONTH_OPTIONS, ALL_TIME_FROM, todayISO, prevMonthKey } from '../../../core/dates';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { PageLayout } from '../../../shell/PageLayout';
import { PageSection, ResponsiveGrid, Button, Select } from '../../../shell/primitives';

const achvStyle = (a) => (a >= 90 ? { background: '#EAF3DE', color: '#27500A' } : a >= 70 ? { background: '#FAEEDA', color: '#854F0B' } : { background: '#FCEBEB', color: '#A32D2D' });
const growthStyle = (g) => (g >= 0 ? { background: '#EAF3DE', color: '#27500A' } : { background: '#FCEBEB', color: '#A32D2D' });

export function MisReport({ branch }) {
  const [period, setPeriod] = useState(CUR_MONTH);
  const PERIODS = MONTH_OPTIONS;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const cur = bc(branch).cur;

  const monthEnd = (key) => { const [y, m] = String(key).split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${key}-${String(last).padStart(2, '0')}`; };
  const gpQ = useGpBills(branch, { from: ALL_TIME_FROM, to: todayISO() });
  const GP_DATA = gpQ.data || [];
  const plQ = useModulePL(branch, { from: `${period}-01`, to: monthEnd(period) });
  const agQ = useAgeing(branch);

  const inBr = (b) => (!brCode || b.branch === brCode);
  const bills = GP_DATA.filter((b) => inBr(b) && String(b.date).startsWith(period));
  const prev = GP_DATA.filter((b) => inBr(b) && String(b.date).startsWith(prevMonthKey(period)));

  const rev = bills.reduce((s, b) => s + (+b.sell || 0), 0);
  const cost = bills.reduce((s, b) => s + (+b.cost || 0), 0);
  const gp = rev - cost;
  const gpPct = rev > 0 ? +(gp / rev * 100).toFixed(1) : 0;
  const exp = plQ.data ? ((plQ.data.indirect && plQ.data.indirect.expense) || 0) : 0;
  const netPft = gp - exp;
  const prevRev = prev.reduce((s, b) => s + (+b.sell || 0), 0);
  const prevGP = prev.reduce((s, b) => s + ((+b.sell || 0) - (+b.cost || 0)), 0);
  const revGrowth = prevRev > 0 ? +((rev - prevRev) / prevRev * 100).toFixed(1) : null;
  const gpGrowth = prevGP > 0 ? +((gp - prevGP) / prevGP * 100).toFixed(1) : null;

  const consultMap = {};
  bills.forEach((b) => { const k = b.consultant || '—'; if (!consultMap[k]) consultMap[k] = { rev: 0, gp: 0, bks: 0 }; consultMap[k].rev += (+b.sell || 0); consultMap[k].gp += ((+b.sell || 0) - (+b.cost || 0)); consultMap[k].bks++; });
  const topConsult = Object.entries(consultMap).sort((a, b) => b[1].gp - a[1].gp).slice(0, 3);

  const clientMap = {};
  bills.forEach((b) => { const k = b.client || '—'; if (!clientMap[k]) clientMap[k] = { rev: 0, gp: 0 }; clientMap[k].rev += (+b.sell || 0); clientMap[k].gp += ((+b.sell || 0) - (+b.cost || 0)); });
  const topClients = Object.entries(clientMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 3);

  const overdueClients = ((agQ.data && agQ.data.receivables && agQ.data.receivables.rows) || [])
    .map((r) => ({ client: r.party, outstanding: (r.d60 || 0) + (r.d90 || 0) }))
    .filter((c) => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);

  const trendMonths = Array.from({ length: 5 }, (_, i) => { const [y, m] = period.split('-').map(Number); const d = new Date(y, m - 1 - (4 - i), 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const trendData = trendMonths.map((m) => { const mb = GP_DATA.filter((b) => inBr(b) && String(b.date).startsWith(m)); const mr = mb.reduce((s, b) => s + (+b.sell || 0), 0); const mg = mb.reduce((s, b) => s + ((+b.sell || 0) - (+b.cost || 0)), 0); return { m, rev: mr, gp: mg, gpPct: mr > 0 ? +(mg / mr * 100).toFixed(1) : 0 }; });
  const maxRev = Math.max(...trendData.map((t) => t.rev), 1);

  const f = (n) => (n >= 10000000 ? cur + (n / 10000000).toFixed(1) + 'Cr' : n >= 100000 ? cur + (n / 100000).toFixed(1) + 'L' : n >= 1000 ? cur + (n / 1000).toFixed(0) + 'K' : cur + n.toFixed(0));
  const pct = (val, total) => (total > 0 ? Math.round(val / total * 100) : 0);
  const periodLabel = PERIODS.find((p) => p.v === period)?.l;

  const KPI = ({ label, value, sub, growth, color }) => (
    <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: color || '#185FA5' }}>
      <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: color || '#185FA5' }}>{label}</p>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-navy tablet:text-xl">{value}</p>
      {sub && <p className="text-[10px] text-ink-muted">{sub}</p>}
      {growth != null && (
        <div className="mt-1">
          <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold" style={growthStyle(growth)}>{growth >= 0 ? '+' : ''}{growth}% MoM</span>
        </div>
      )}
    </div>
  );

  return (
    <PageLayout
      title="Management Information System"
      subtitle={`${periodLabel} · ${brCode || CONSOLIDATED_LABEL} · Monday Morning Report`}
      actions={<Button size="sm" variant="primary" icon={Download} onClick={() => window.print()}>Export</Button>}
      filters={<Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-auto">{PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</Select>}
    >
      <ResponsiveGrid min="160px" gap="md" className="mb-3.5">
        <KPI label="Revenue" value={f(rev)} sub={`${bills.length} bookings`} growth={revGrowth} color="#185FA5" />
        <KPI label="Gross Profit" value={f(gp)} sub={`GP% ${gpPct}%`} growth={gpGrowth} color="#27500A" />
        <KPI label="Net Profit" value={f(netPft)} sub={`After expenses ${f(exp)}`} color={netPft > 0 ? '#1D9E75' : '#A32D2D'} />
        <KPI label="GP%" value={`${gpPct}%`} sub={`Prev: ${prevRev > 0 ? +(prevGP / prevRev * 100).toFixed(1) : 0}%`} color={gpPct >= 12 ? '#27500A' : gpPct >= 8 ? '#854F0B' : '#A32D2D'} />
        <KPI label="Bookings" value={String(bills.length)} sub={`Prev period: ${prev.length}`} color="#384677" />
      </ResponsiveGrid>

      <div className="mb-3 grid grid-cols-1 gap-3 desktop:grid-cols-[2fr_1fr]">
        {/* Revenue trend */}
        <PageSection title="📊 Revenue Trend vs GP — Last 5 Months">
          <div className="relative flex h-[140px] items-end gap-1.5 pb-5">
            {trendData.map((t) => {
              const barH = maxRev > 0 ? Math.round(t.rev / maxRev * 120) : 0;
              const gpH = maxRev > 0 ? Math.round(t.gp / maxRev * 120) : 0;
              const isCur = t.m === period;
              return (
                <div key={t.m} className="flex flex-1 flex-col items-center gap-px">
                  <p className="mb-0.5 text-center text-[8.5px] font-semibold" style={{ color: isCur ? '#185FA5' : '#5a6691' }}>{f(t.rev)}</p>
                  <div className="flex h-[120px] w-full items-end gap-px">
                    <div className="flex-1 rounded-t" style={{ height: barH, minHeight: 2, background: isCur ? '#185FA5' : '#B5D4F4' }} />
                    <div className="flex-1 rounded-t" style={{ height: gpH, minHeight: 2, background: isCur ? '#27500A' : '#C0DD97' }} />
                  </div>
                  <p className="text-center text-[8px]" style={{ color: isCur ? '#0d1326' : '#5a6691', fontWeight: isCur ? 700 : 400 }}>{t.m.slice(5)}</p>
                  <p className="text-[7.5px] text-[#854F0B]">{t.gpPct}%</p>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-3 text-[9.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#185FA5]" />Revenue</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#27500A]" />GP</span>
          </div>
        </PageSection>

        {/* Top consultants */}
        <PageSection title={`🏆 Top Consultants — ${periodLabel}`}>
          {topConsult.length === 0 && <p className="text-[11px] text-ink-muted">No data for this period/branch</p>}
          {topConsult.map(([name, dd], i) => (
            <div key={name} className="border-b border-surface-alt py-2 last:border-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="text-sm">{['🥇', '🥈', '🥉'][i]}</span><span className="text-[11px] font-semibold text-navy">{name}</span></span>
                <span className="text-[11px] font-bold text-[#27500A]">{f(dd.gp)}</span>
              </div>
              <div className="flex justify-between text-[9.5px] text-ink-muted"><span>{dd.bks} bookings · Rev {f(dd.rev)}</span><span>{pct(dd.rev, rev)}% of total</span></div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-border"><div className="h-full rounded-full bg-[#27500A]" style={{ width: `${pct(dd.rev, rev)}%` }} /></div>
            </div>
          ))}
        </PageSection>
      </div>

      <ResponsiveGrid cols={3} gap="md">
        {/* Top clients */}
        <PageSection title="👥 Top Clients">
          {topClients.map(([name, dd]) => (
            <div key={name} className="border-b border-surface-alt py-1.5 last:border-0">
              <div className="flex justify-between"><span className="text-[11px] font-semibold text-navy">{name}</span><span className="text-[11px] font-bold text-[#185FA5]">{f(dd.rev)}</span></div>
              <div className="mt-px text-[9.5px] text-ink-muted">GP: {f(dd.gp)} ({pct(dd.gp, gp)}% of total GP)</div>
            </div>
          ))}
          {topClients.length === 0 && <p className="text-[11px] text-ink-muted">No data for this period.</p>}
        </PageSection>

        {/* Overdue receivables */}
        <PageSection title="⚠ Overdue Receivables" className="border-t-[3px] border-t-maroon">
          {overdueClients.slice(0, 4).map((c) => (
            <div key={c.client} className="flex justify-between border-b border-surface-alt py-1.5"><span className="text-[10.5px] text-navy">{c.client}</span><span className="text-[11px] font-bold text-maroon">{f(c.outstanding)}</span></div>
          ))}
          {overdueClients.length === 0 && <p className="text-[11px] text-[#27500A]">✔ No overdue receivables</p>}
          <div className="mt-2 rounded-lg bg-[#FCEBEB] px-2.5 py-1.5 text-[9.5px] font-semibold text-maroon">Total: {f(overdueClients.reduce((s, c) => s + c.outstanding, 0))}</div>
        </PageSection>

        {/* Action items */}
        <PageSection title="📋 Action Items This Week" className="border-t-[3px] border-t-[#854F0B]">
          {[
            { icon: '💳', text: 'BSP payment due Monday — check BSP Summary', urgent: true },
            { icon: '📋', text: `GSTR-3B filing — ${period === '2026-05' ? '20 Jun 2026' : '20 May 2026'}`, urgent: false },
            { icon: '📞', text: `Follow up: ${overdueClients[0]?.client || '—'} overdue`, urgent: overdueClients.length > 0 },
            { icon: '👥', text: `${prev.length} bookings in pipeline from last month`, urgent: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 border-b border-surface-alt py-1.5"><span>{item.icon}</span><span className="text-[10.5px] leading-snug" style={{ color: item.urgent ? '#A32D2D' : '#384677', fontWeight: item.urgent ? 600 : 400 }}>{item.text}</span></div>
          ))}
        </PageSection>
      </ResponsiveGrid>
    </PageLayout>
  );
}

export default MisReport;
