import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { CUR_FY } from '../../../core/dates';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { PeriodBar, periodRange } from '../../../core/period';
import { BRANCHES } from '../../../core/data';
import { RevenueTrendChart } from '../components/shared/RevenueTrendChart';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { BranchPlHeatmap } from '../components/shared/BranchPlHeatmap';
import { KeyAlertsPanel } from '../components/shared/KeyAlertsPanel';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';
import { useModulePL, useBalanceSheet, useAgeing, useTaxSummary, useTrialBalance } from '../../../core/useAccounting';

const RANGE_SHORT = { month: 'This Month', quarter: 'This Quarter', ytd: 'YTD', all: 'All Time' };
const C = { dark: '#0d1326', dim: '#5a6691', green: '#1f7a3d', red: '#A32D2D', gold: '#854F0B', border: '#e7e9f0' };
const th = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` };
const td = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #f3f4f8' };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const m0 = (n) => fmtINR(Math.round(Number(n) || 0));

export function DirectorDashboardPage({ currentUser, setRoute }) {
  const { navigate } = useDashboardActions(setRoute);
  const scope = useDashboardStore((s) => s.scope);
  const setScope = useDashboardStore((s) => s.setScope);
  const compare = useDashboardStore((s) => s.compareLastYear);
  const setCompare = useDashboardStore((s) => s.setCompareLastYear);
  const pinned = useDashboardStore((s) => s.pinnedWidgets);
  const togglePin = useDashboardStore((s) => s.togglePinnedWidget);

  // Live owner widgets (GP-by-module, balance sheet, ageing, cash) — respect period + scope.
  const branchArg = scope && scope !== 'ALL' ? { code: scope } : 'ALL';
  const [period, setPeriod] = React.useState(() => periodRange('cfy', { branch: branchArg }));
  const dates = period; // { from, to, label }
  const { data, totalCashInr, isLoading } = useDirectorDashboard({ scope, from: period.from, to: period.to });
  const mpl = useModulePL(branchArg, dates).data || {};
  const bs = useBalanceSheet(branchArg, { to: dates.to }).data || {};
  const age = useAgeing(branchArg).data || {};
  const tax = useTaxSummary(branchArg, dates).data || {};
  const trial = useTrialBalance(branchArg, dates).data || {};

  const Controls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0 14px' }}>
      <PeriodBar branch={branchArg} defaultPreset="cfy" onChange={setPeriod} />
      <select value={scope} onChange={(e) => setScope(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', color: C.dark }}>
        <option value="ALL">All branches</option>
        {BRANCHES.filter((b) => b.code).map((b) => <option key={b.code} value={b.code}>{b.code} — {b.city}</option>)}
      </select>
    </div>
  );

  if (isLoading || !data) {
    return (
      <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
        <DashboardHeader title="Director Dashboard" subtitle="Whole-company owner view" user={currentUser} onExport={() => window.print()} />
        {Controls}
        <div style={{ padding: '24px', color: C.dim, fontSize: 12 }}>Loading director dashboard…</div>
      </div>
    );
  }

  const { revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers } = data;
  const fig = data.figures || { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 };
  const pb = data.pendingBookings || { count: 0, sales: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, gp: 0 };
  const rangeShort = period.label || 'Period';

  // derived live figures
  const assets = bs.assets || [], liabs = bs.liabilities || [];
  const aT = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const lT = liabs.reduce((s, a) => s + (a.amount || 0), 0);
  const balanced = Math.abs(aT - lT) < 1;
  const netWorth = liabs.filter((l) => /capital|reserve|profit|equity|surplus/i.test(l.name || '')).reduce((s, l) => s + (l.amount || 0), 0);
  const bankRows = (trial.rows || []).filter((r) => /cash|bank/i.test(r.group || ''));
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0);
  const liquid = bankRows.reduce((s, r) => s + bal(r), 0) || fig.cash || totalCashInr;
  const arOverdue = age?.receivables?.totals?.d90 || 0;
  const mods = (mpl.modules || []).slice().sort((a, b) => (b.gp || 0) - (a.gp || 0));

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader title="Director Dashboard" subtitle="Whole-company owner view" user={currentUser} onExport={() => window.print()} />
      {Controls}

      {/* ── Headline KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard label="Cash & Bank" value={m0(liquid)} delta={liquid < 0 ? 'overdrawn' : 'liquid'} color={liquid < 0 ? C.red : '#22c55e'} onClick={() => navigate('/dashboards/cash')} />
        <KPICard label={`Revenue · ${rangeShort}`} value={m0(fig.revenue)} delta="" color="#d4a437" onClick={() => navigate('/reports/pnl')} />
        <KPICard label="Gross Profit" value={m0(fig.gp)} delta={fig.gpPct ? `${fig.gpPct}% GP` : ''} color="#22c55e" onClick={() => navigate('/reports/gp')} />
        <KPICard label="Net Profit" value={m0(fig.netProfit)} delta={fig.revenue ? `${((fig.netProfit / fig.revenue) * 100).toFixed(1)}% margin` : ''} color={fig.netProfit >= 0 ? C.green : C.red} onClick={() => navigate('/reports/pnl')} />
        <KPICard label="Receivables" value={m0(fig.outstanding)} delta={arOverdue ? `${m0(arOverdue)} overdue 90+` : 'to collect'} color={arOverdue ? C.red : C.gold} onClick={() => navigate('/dashboards/arap')} />
        <KPICard label="Payables" value={m0(fig.payable)} delta="to pay" color={C.red} onClick={() => navigate('/dashboards/arap')} />
        <KPICard label="GST / Tax Net" value={m0(tax.netPayable || 0)} delta={(tax.netPayable || 0) >= 0 ? 'payable' : 'refundable'} color="#185FA5" onClick={() => navigate('/taxation')} />
        <KPICard label="Pending Approvals" value={m0(pb.sales)} delta={`${pb.count} awaiting`} color={pb.count ? '#f97316' : '#22c55e'} onClick={() => navigate('/transactions/approvals')} />
      </div>

      {/* ── Bookings pipeline (condensed) ── */}
      <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: C.dim }}>SO/PO/GP Pipeline · {rangeShort}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard label="Approved Sales" value={m0(ab.sales)} delta={`${ab.count} posted`} color="#d4a437" onClick={() => navigate('/transactions/approvals')} />
        <KPICard label="Approved GP" value={m0(ab.gp)} delta={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP` : ''} color="#22c55e" onClick={() => navigate('/transactions/approvals')} />
        <KPICard label="Pending Sales" value={m0(pb.sales)} delta={`${pb.count} to approve`} color="#f97316" onClick={() => navigate('/transactions/approvals')} />
        <KPICard label="Pending GP" value={m0(pb.gp)} delta="not yet posted" color="#f97316" onClick={() => navigate('/transactions/approvals')} />
      </div>

      {/* ── Trend + Targets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard title="Revenue Trend — 12 Months" subtitle={compare ? 'Current Year vs Last Year' : 'Current Year only'} onPin={() => togglePin('rev')} pinned={pinned.rev} onDrill={() => navigate('/reports/pnl')}>
          <RevenueTrendChart data={revenueTrend} compareLastYear={compare} onToggleCompare={setCompare} />
        </WidgetCard>
        <WidgetCard title={`FY ${CUR_FY.label} Targets vs Actual`} onPin={() => togglePin('targets')} pinned={pinned.targets} onDrill={() => navigate('/dashboards/sales-target')}>
          <FyTargetsPanel targets={fyTargets} />
        </WidgetCard>
      </div>

      {/* ── GP by Module + Balance Sheet ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard title="Gross Profit by Module" subtitle="Which products earn" onDrill={() => navigate('/dashboards/module-gp')}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Sales</th><th style={{ ...th, ...num }}>GP</th><th style={{ ...th, ...num }}>GP %</th></tr></thead>
            <tbody>
              {mods.map((mm) => <tr key={mm.key}><td style={td}>{mm.name || mm.key}</td><td style={{ ...td, ...num }}>{m0(mm.sales)}</td><td style={{ ...td, ...num, fontWeight: 700, color: (mm.gp || 0) < 0 ? C.red : C.green }}>{m0(mm.gp)}</td><td style={{ ...td, ...num }}>{(mm.gpPct || 0).toFixed(1)}%</td></tr>)}
              {!mods.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>No data for this period.</td></tr>}
            </tbody>
          </table>
        </WidgetCard>
        <WidgetCard title="Balance Sheet — Position" subtitle={`As on ${dates.to || 'today'}`} onDrill={() => navigate('/dashboards/balance-sheet')}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={td}>Total Assets</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(aT)}</td></tr>
              <tr><td style={td}>Total Liabilities &amp; Capital</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(lT)}</td></tr>
              <tr><td style={td}>Net Worth (Capital + Reserves + P&amp;L)</td><td style={{ ...td, ...num, fontWeight: 700, color: netWorth < 0 ? C.red : C.green }}>{m0(netWorth)}</td></tr>
              <tr><td style={td}>Balanced</td><td style={{ ...td, ...num, fontWeight: 700, color: balanced ? C.green : C.red }}>{(aT || lT) ? (balanced ? '✓ Yes' : '✗ ' + m0(aT - lT)) : '—'}</td></tr>
            </tbody>
          </table>
        </WidgetCard>
      </div>

      {/* ── AR/AP Ageing + Cash & Bank ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard title="Receivables / Payables Ageing" subtitle="As of today" onDrill={() => navigate('/dashboards/arap')}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}></th><th style={{ ...th, ...num }}>0–30</th><th style={{ ...th, ...num }}>30–60</th><th style={{ ...th, ...num }}>60–90</th><th style={{ ...th, ...num }}>90+</th><th style={{ ...th, ...num }}>Total</th></tr></thead>
            <tbody>
              {[['Receivable', age.receivables?.totals], ['Payable', age.payables?.totals]].map(([lbl, t]) => (
                <tr key={lbl}><td style={{ ...td, fontWeight: 700 }}>{lbl}</td><td style={{ ...td, ...num }}>{m0(t?.d0)}</td><td style={{ ...td, ...num }}>{m0(t?.d30)}</td><td style={{ ...td, ...num }}>{m0(t?.d60)}</td><td style={{ ...td, ...num, color: (t?.d90) ? C.red : undefined }}>{m0(t?.d90)}</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(t?.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </WidgetCard>
        <WidgetCard title="Cash & Bank" subtitle="Live balances" onDrill={() => navigate('/dashboards/cash')}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {bankRows.map((r, i) => <tr key={i}><td style={td}>{r.ledger || r.name}</td><td style={{ ...td, ...num, fontWeight: 700, color: bal(r) < 0 ? C.red : C.dark }}>{m0(bal(r))}</td></tr>)}
              {!bankRows.length && <tr><td style={{ ...td, color: C.dim }}>Cash &amp; Bank (net)</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(liquid)}</td></tr>}
            </tbody>
          </table>
        </WidgetCard>
      </div>

      {/* ── Branch heatmap + Alerts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard title="Branch P&L Heatmap" subtitle="GP % by branch × month — darker = higher margin" onPin={() => togglePin('heat')} pinned={pinned.heat} onDrill={() => navigate('/dashboards/branch')}>
          <BranchPlHeatmap rows={branchHeatmap} />
        </WidgetCard>
        <WidgetCard title="Attention Needed" subtitle={keyAlerts.length + ' active'} onPin={() => togglePin('alerts')} pinned={pinned.alerts}>
          <KeyAlertsPanel alerts={keyAlerts} onAlertClick={navigate} />
        </WidgetCard>
      </div>

      {/* ── Top customers / suppliers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <WidgetCard title="Top 10 Customers" onPin={() => togglePin('topcust')} pinned={pinned.topcust} onDrill={() => navigate('/masters/customers')}>
          <TopEntitiesTable rows={topCustomers} kind="customer" />
        </WidgetCard>
        <WidgetCard title="Top 10 Suppliers" onPin={() => togglePin('topsup')} pinned={pinned.topsup} onDrill={() => navigate('/masters/suppliers')}>
          <TopEntitiesTable rows={topSuppliers} kind="supplier" valueKey="spend" countKey="vouchers" />
        </WidgetCard>
      </div>
    </div>
  );
}
