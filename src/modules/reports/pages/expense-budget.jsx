/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Expense Budget vs Actual — LIVE (DB budgets + posted actuals).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. All budget/actual/variance math is unchanged
   (DB-backed budgets via useExpenseBudgets, live actuals via
   useBudgetVsActual, MTD/YTD/Annual views, all-branches roll-up). KPIs +
   branch cards → ResponsiveGrid; the ledger grid → DataTable (sort, totals
   footer, mobile scroll); the monthly strip keeps its custom horizontal
   scroll. Uses PageLayout for the custom "Edit Budget" action.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useBgtRefresh } from '../../../core/hooks';
import { useExpenseLedgers, useFiscalYears, useExpenseBudgets } from '../../../core/useReference';
import { useBudgetVsActual } from '../../../core/useAccounting';
import { bc } from '../../../core/styles';
import { BRANCHES, CONSOLIDATED_LABEL } from '../../../core/data';
import { CUR_FY, CUR_MONTH } from '../../../core/dates';
import { GRP_COLORS } from '../../../core/helpers';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, Button, Select } from '../../../shell/primitives';

const pctColor = (p) => (p === null ? '#bfc3d6' : p <= 80 ? '#27500A' : p <= 100 ? '#1D9E75' : p <= 120 ? '#854F0B' : '#A32D2D');
const pctBg = (p) => (p === null ? '#f3f4f8' : p <= 100 ? '#EAF3DE' : p <= 120 ? '#FAEEDA' : '#FCEBEB');
const pctLabel = (p) => (p === null ? 'No budget' : p <= 80 ? 'Under budget' : p <= 100 ? 'On budget' : p <= 120 ? 'Slightly over' : 'Over budget');
const vColor = (v) => (v >= 0 ? '#27500A' : '#A32D2D');

const Bar = ({ pct, h = 8 }) => (
  <div className="min-w-[50px] overflow-hidden rounded-full bg-surface-alt" style={{ height: h }}>
    <div className="h-full rounded-full" style={{ width: `${Math.min(pct || 0, 100)}%`, background: pctColor(pct) }} />
  </div>
);

export function ReportExpenseBgt({ branch, setRoute }) {
  useBgtRefresh();
  const EXP_LEDGERS = useExpenseLedgers().data || [];
  const FY_LIST = useFiscalYears().data || [];
  const budgetRows = useExpenseBudgets().data;
  const bgtFor = (brc, fyv) => Object.fromEntries((budgetRows || []).filter((r) => r.branch === brc && r.fy === fyv).map((r) => [r.ledgerCode, { monthly: r.monthly, yearly: r.yearly }]));
  const [fy, setFy] = useState(CUR_FY.label);
  const [selMonth, setSelMonth] = useState(CUR_MONTH);
  const [view, setView] = useState('mtd');
  const [groupFilter, setGroupFilter] = useState('All');
  const [activeBr, setActiveBr] = useState(null);

  const isAll = branch === 'ALL';
  const brObj = isAll ? (activeBr || BRANCHES[1]) : (branch || BRANCHES[1]);
  const brCode = brObj?.code || 'BOM';
  const cur = bc(brObj).cur;
  const fyObj = FY_LIST.find((ff) => ff.v === fy || ff.l === fy) || FY_LIST[1] || { l: fy, v: fy, keys: [], months: [] };
  const budget = bgtFor(brCode, fyObj.v);
  const fyKeys = fyObj.keys || [];
  const ytdMonths = fyKeys.filter((k) => k <= selMonth);

  const mEnd = (key) => { const [y, m] = String(key).split('-').map(Number); return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`; };
  const viewFrom = view === 'mtd' ? `${selMonth}-01` : `${fyKeys[0] || selMonth}-01`;
  const viewTo = view === 'annual' ? mEnd(fyKeys[fyKeys.length - 1] || selMonth) : mEnd(selMonth);
  const bvaQ = useBudgetVsActual(brObj, { from: viewFrom, to: viewTo, fy: fyObj.v });
  const actByCode = Object.fromEntries((bvaQ.data?.rows || []).map((r) => [r.code, r.actual || 0]));
  const getAct = (id) => actByCode[id] || 0;

  const getViewData = (id) => {
    if (view === 'mtd') return { bgt: budget[id]?.monthly || 0, act: getAct(id) };
    if (view === 'ytd') return { bgt: (budget[id]?.monthly || 0) * ytdMonths.length, act: getAct(id) };
    return { bgt: budget[id]?.yearly || 0, act: getAct(id) };
  };

  const visLedgers = EXP_LEDGERS.filter((l) => groupFilter === 'All' || l.group === groupFilter);
  const rows = visLedgers.map((l) => { const { bgt, act } = getViewData(l.id); const variance = bgt - act; const pct = bgt > 0 ? +(act / bgt * 100).toFixed(1) : null; return { ...l, bgt, act, variance, pct }; });
  const totBgt = rows.reduce((s, r) => s + r.bgt, 0);
  const totAct = rows.reduce((s, r) => s + r.act, 0);
  const totVar = totBgt - totAct;
  const totPct = totBgt > 0 ? +(totAct / totBgt * 100).toFixed(1) : null;

  const f = (n) => (n >= 1000000 ? (n / 100000).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n > 0 ? String(Math.round(n)) : '—');
  const ff = (n) => (n > 0 ? cur + Number(n).toLocaleString('en-IN') : '—');

  const allBranchSummary = isAll ? BRANCHES.map((b) => {
    const bBgt = bgtFor(b.code, fyObj.v);
    const bCur = bc(b).cur;
    const totB = EXP_LEDGERS.reduce((s, l) => s + (view === 'annual' ? bBgt[l.id]?.yearly || 0 : (bBgt[l.id]?.monthly || 0) * (view === 'ytd' ? ytdMonths.length : 1)), 0);
    const isActive = b.code === brCode;
    const totA = isActive ? totAct : null;
    const pct = isActive && totB > 0 ? +(totA / totB * 100).toFixed(1) : null;
    return { b, bCur, totB, totA, var: totA == null ? null : totB - totA, pct, isActive };
  }) : null;

  const viewLabel = view === 'mtd' ? `MTD — ${fyObj.months[fyObj.keys.indexOf(selMonth)] || selMonth}` : view === 'ytd' ? `YTD — ${ytdMonths.length} months to ${fyObj.months[fyObj.keys.indexOf(selMonth)] || selMonth}` : `Full Year — ${fyObj.l}`;

  const KPIS = [
    { l: 'Budget', v: ff(totBgt), sub: viewLabel, c: '#185FA5' },
    { l: 'Actual', v: ff(totAct), sub: 'expenses incurred', c: totAct > totBgt ? '#A32D2D' : '#27500A' },
    { l: 'Variance', v: (totVar >= 0 ? '+' : '') + ff(Math.abs(totVar)), sub: totVar >= 0 ? 'Under budget' : 'OVER BUDGET', c: vColor(totVar) },
    { l: 'Utilisation', v: totPct === null ? '—' : `${totPct}%`, sub: pctLabel(totPct), c: pctColor(totPct) },
    { l: 'Over budget', v: `${rows.filter((r) => r.pct !== null && r.pct > 100).length} ledgers`, sub: 'review needed', c: '#A32D2D' },
  ];

  const columns = [
    { key: 'name', header: 'Expense Ledger', hideable: false, className: 'font-semibold text-navy', render: (r, v) => <span className="inline-flex items-center gap-2"><span className="text-base">{r.icon}</span>{v}</span>, footerLabel: `TOTAL — ${brCode}` },
    { key: 'group', header: 'Group', render: (r, v) => <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (GRP_COLORS[v] || '#384677') + '22', color: GRP_COLORS[v] || '#384677' }}>{v}</span> },
    { key: 'bgt', header: view === 'mtd' ? 'MTD Budget' : view === 'ytd' ? 'YTD Budget' : 'Annual Budget', num: true, className: 'text-ink-muted', render: (r, v) => (v > 0 ? ff(v) : <span className="text-[10px] text-ink-subtle">Not set</span>), footer: () => ff(totBgt) },
    { key: 'act', header: view === 'mtd' ? 'MTD Actual' : view === 'ytd' ? 'YTD Actual' : 'Annual Actual', num: true, className: 'font-bold', render: (r, v) => (v > 0 ? ff(v) : '—'), footer: () => ff(totAct) },
    { key: 'util', header: 'Utilisation', sortable: false, render: (r) => (r.bgt > 0 && r.act > 0 ? <Bar pct={r.pct} h={10} /> : null) },
    { key: 'pct', header: 'Util %', num: true, render: (r, v) => (v !== null ? <StatusPill size="sm" tone="neutral"><span style={{ color: pctColor(v) }}>{v}%</span></StatusPill> : null), footer: () => (totPct !== null ? `${totPct}%` : '—') },
    { key: 'variance', header: 'Variance', num: true, render: (r, v) => (r.bgt > 0 ? <span className="font-bold" style={{ color: vColor(v) }}>{(v >= 0 ? '+' : '') + ff(Math.abs(v))}</span> : '—'), footer: () => (totVar >= 0 ? '+' : '') + ff(Math.abs(totVar)) },
    { key: 'status', header: 'Status', align: 'center', sortable: false, render: (r) => (r.bgt > 0 ? <span className="rounded-full px-2 py-0.5 text-[9.5px] font-bold" style={{ background: pctBg(r.pct), color: pctColor(r.pct) }}>{pctLabel(r.pct)}</span> : <span className="text-ink-subtle">—</span>) },
  ];

  const viewToggle = (
    <div className="inline-flex overflow-hidden rounded-md border border-surface-border">
      {['mtd', 'ytd', 'annual'].map((v) => (
        <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-semibold uppercase transition ${view === v ? 'bg-navy text-gold' : 'bg-surface text-ink-muted hover:bg-surface-alt'}`}>{v}</button>
      ))}
    </div>
  );

  return (
    <PageLayout
      title="Expense BGT vs Actual"
      subtitle={`${isAll ? CONSOLIDATED_LABEL : brCode} · ${viewLabel}`}
      actions={<Button size="sm" variant="secondary" icon={Pencil} onClick={() => setRoute && setRoute('/expense/budget')}>Edit Budget</Button>}
      filters={
        <>
          <Select value={fy} onChange={(e) => setFy(e.target.value)} className="w-auto">{FY_LIST.map((ff2) => <option key={ff2.v} value={ff2.v}>{ff2.l}</option>)}</Select>
          {(view === 'mtd' || view === 'ytd') && <Select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} className="w-auto">{fyObj.keys.map((k, i) => <option key={k} value={k}>{fyObj.months[i]}</option>)}</Select>}
          <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-auto">{['All', ...new Set(EXP_LEDGERS.map((l) => l.group))].map((g) => <option key={g}>{g}</option>)}</Select>
          {viewToggle}
        </>
      }
    >
      {/* All-branches overview */}
      {isAll && allBranchSummary && (
        <>
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <p className="mr-1.5 text-[10.5px] font-semibold text-ink-muted">Detailed view:</p>
            {BRANCHES.map((b) => (
              <button key={b.code} onClick={() => setActiveBr(b)} className={`rounded-lg border px-3 py-2 text-[11px] transition max-tablet:min-h-[44px] ${brCode === b.code ? 'border-navy bg-navy font-bold text-gold' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'}`}>
                {b.flag} {b.code}
              </button>
            ))}
          </div>
          <ResponsiveGrid min="200px" gap="md" className="mb-4">
            {allBranchSummary.map(({ b, bCur, totB, totA, var: v, pct }) => (
              <button key={b.code} onClick={() => setActiveBr(b)} style={{ borderTopColor: pctColor(pct) }}
                className={`rounded-brand border border-t-[3px] px-3.5 py-3 text-left transition ${brCode === b.code ? 'border-navy bg-[#f0f4ff]' : 'border-surface-border bg-surface hover:bg-surface-alt'}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-navy">{b.flag} {b.code}{b.city ? ` — ${b.city}` : ''}</span>
                  {pct !== null && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold" style={{ background: pctBg(pct), color: pctColor(pct) }}>{pct}%</span>}
                </div>
                <div className="mb-2 grid grid-cols-2 gap-1 text-[10.5px]">
                  <div><p className="text-ink-muted">Budget</p><p className="font-bold text-role-hr">{bCur}{f(totB)}</p></div>
                  <div><p className="text-ink-muted">Actual</p><p className="font-bold" style={{ color: totA == null ? '#bfc3d6' : totA > totB ? '#A32D2D' : '#27500A' }}>{totA == null ? '—' : bCur + f(totA)}</p></div>
                </div>
                <Bar pct={pct} h={8} />
                <p className="mt-1.5 text-[9.5px] font-bold" style={{ color: v == null ? '#5a6691' : v >= 0 ? '#27500A' : '#A32D2D' }}>{v == null ? 'Open this branch for actuals' : `${v >= 0 ? 'Under' : 'Over'} by ${bCur}${f(Math.abs(v))}`}</p>
              </button>
            ))}
          </ResponsiveGrid>
        </>
      )}

      <ResponsiveGrid min="150px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
            <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-navy tablet:text-xl">{k.v}</p>
            <p className="text-[10px] text-ink-muted">{k.sub}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable
        className="mb-3"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        dense
        showColumnToggle
        exportName={`expense-budget-${brCode}`}
        printTitle="Expense Budget vs Actual"
        emptyMessage="No expense ledgers for this filter."
      />

      {/* Monthly trend strip */}
      <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold text-navy">Monthly Trend — {fyObj.l} · {brCode}</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5">
          {fyObj.keys.map((k, ki) => {
            const mAct = (view === 'mtd' && k === selMonth) ? totAct : null;
            const mBgt = EXP_LEDGERS.reduce((s, l) => s + (budget[l.id]?.monthly || 0), 0);
            const mPct = (mBgt > 0 && mAct != null) ? +(mAct / mBgt * 100).toFixed(0) : null;
            const isSelected = k === selMonth;
            return (
              <button key={k} onClick={() => { setSelMonth(k); if (view === 'annual') setView('mtd'); }} style={{ background: isSelected ? '#0d1326' : pctBg(mPct) }}
                className={`min-w-[58px] flex-1 rounded-lg border-2 px-1.5 py-2 text-center ${isSelected ? 'border-navy' : 'border-surface-border'}`}>
                <p className="text-[9px] font-bold" style={{ color: isSelected ? '#d4a437' : '#384677' }}>{fyObj.months[ki]}</p>
                <p className="my-1 text-base font-extrabold" style={{ color: isSelected ? '#fff' : pctColor(mPct) }}>{mPct !== null ? `${mPct}%` : '—'}</p>
                <Bar pct={mPct} h={5} />
                <p className="mt-1 text-[8px]" style={{ color: isSelected ? '#8b94b3' : '#bfc3d6' }}>{mAct != null && mAct > 0 ? cur + f(mAct) : 'no data'}</p>
              </button>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}

export default ReportExpenseBgt;
