import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { CUR_FY } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { directorScope, branchSpecificScope, branchListForScope, scopeBranchArg } from './director-dashboard.scope';
import { isOwnerDashboardUser } from '../../../core/pageCatalog';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { PeriodBar, periodRange } from '../../../core/period';
import { BRANCHES } from '../../../core/data';
import { RevenueTrendChart } from '../components/shared/RevenueTrendChart';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { BranchPlHeatmap } from '../components/shared/BranchPlHeatmap';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';
import { useModulePL, useBalanceSheet, useAgeing, useTaxSummary, useTrialBalance, useTargetsVsActual } from '../../../core/useAccounting';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../../core/api';

import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';
import { isLiquidRow } from '../../../core/ledgerKind';

const RANGE_SHORT = { month: 'This Month', quarter: 'This Quarter', ytd: 'YTD', all: 'All Time' };
const C = { dark: '#14161a', dim: '#5b616e', green: '#16a34a', red: '#dc2626', gold: '#b45309', border: '#e6e8ec' };
const th = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
const td = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #f4f5f7' };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const Scroll = ({ children }) => <div style={{ overflowX: 'auto' }}>{children}</div>;

export function DirectorDashboardPage({ currentUser, setRoute, branch, consolidated = false }) {
  const { navigate } = useDashboardActions(setRoute);
  // Owner Dashboard ('consolidated') may aggregate ALL branches; the Director
  // Dashboard is strictly branch-specific — it never blends branches. When the
  // consolidated/TK HO Group view is selected on the Director Dashboard there is
  // no single branch to show, so we render a "pick a branch" notice instead.
  const scope = consolidated ? directorScope(branch) : branchSpecificScope(branch);
  const needsBranch = !consolidated && !scope;
  const effScope = scope || 'ALL';
  const compare = useDashboardStore((s) => s.compareLastYear);
  const setCompare = useDashboardStore((s) => s.setCompareLastYear);
  const pinned = useDashboardStore((s) => s.pinnedWidgets);
  const togglePin = useDashboardStore((s) => s.togglePinnedWidget);

  // Live owner widgets (GP-by-module, balance sheet, ageing, cash) — respect period + scope.
  const branchArg = scopeBranchArg(effScope);
  const [period, setPeriod] = React.useState(() => periodRange('all', { branch: branchArg }));
  const dates = period; // { from, to, label }
  const { data, totalCashInr, isLoading, isError, error, refetch } = useDirectorDashboard({ scope: effScope, from: period.from, to: period.to });
  // Branch-aware money — uses the active branch's currency symbol (USD branches
  // NBO/DAR/FBM no longer see ₹); falls back to ₹ for the consolidated (ALL) view.
  const cur = bc(branch).cur;
  const m0 = (n) => compactAmt(Math.round(Number(n) || 0), { currency: cur });
  const mpl = useModulePL(branchArg, { ...dates, summary: true }).data || {};
  const bs = useBalanceSheet(branchArg, { to: dates.to }).data || {};
  const age = useAgeing(branchArg).data || {};
  const tax = useTaxSummary(branchArg, dates).data || {};
  const trial = useTrialBalance(branchArg, dates).data || {};

  // Live FY targets (Sales + GP) — replaces the old empty FY_TARGETS_DATA seed.
  const fy = (() => { const d = new Date(); const y = d.getFullYear(); const s = d.getMonth() >= 3 ? y : y - 1; return `${s}-${String(s + 1).slice(-2)}`; })();
  const salesTot = useTargetsVsActual(branchArg, 'sales', { from: dates.from, to: dates.to, fy }).data?.totals;
  const gpTot = useTargetsVsActual(branchArg, 'gp', { from: dates.from, to: dates.to, fy }).data?.totals;
  const liveTargets = [
    { metric: 'Sales', actual: salesTot?.actual || 0, target: salesTot?.target || 0, unit: cur },
    { metric: 'Gross Profit', actual: gpTot?.actual || 0, target: gpTot?.target || 0, unit: cur },
  ].filter((t) => t.target > 0);

  // Live per-branch performance. Group scope ('ALL') compares every branch; a
  // specific branch selection narrows this to that branch only (no cross-branch
  // data) — so the table honours the top-right branch selector like the KPIs do.
  const brList = branchListForScope(effScope, BRANCHES.filter((b) => b.code));
  const bq = useQueries({ queries: brList.map((b) => ({ queryKey: ['accounting', 'module-pl', b.code, dates.from, dates.to, 'summary'], queryFn: () => apiGet('/api/accounting/module-pl', { branch: b.code, from: dates.from, to: dates.to, summary: 1 }) })) });
  const branchRows = brList.map((b, i) => { const d = bq[i].data || {}; return { code: b.code, sales: d?.totals?.sales || 0, gp: d?.totals?.gp || 0, net: d?.bridge?.netProfit || 0 }; });

  const Controls = (
    <div className="mb-3.5 mt-1 flex flex-wrap items-center gap-2.5">
      <PeriodBar branch={branchArg} defaultPreset="all" onChange={setPeriod} />
      <span className="py-1 text-[11px] font-bold text-ink-muted">
        Scope: {effScope === 'ALL' ? 'All branches (Consolidated)' : effScope} — set via the branch selector (top-right)
      </span>
    </div>
  );

  // Director Dashboard with the consolidated view selected → no single branch to
  // show. Prompt to pick one (and point the owner to the consolidated Owner view).
  if (needsBranch) {
    const isOwner = isOwnerDashboardUser(currentUser);
    return (
      <PageLayout>
        <DashboardHeader title="Director Dashboard" subtitle="Branch-specific view" user={currentUser} />
        <div className="mx-auto mt-6 max-w-[560px] rounded-brand border border-surface-border bg-surface p-7 text-center shadow-card">
          <div className="mb-1 text-3xl" aria-hidden="true">🏢</div>
          <p className="m-0 text-sm font-bold text-ink">Select a branch to view its dashboard</p>
          <p className="mx-auto mt-1.5 max-w-[440px] text-xs text-ink-muted">
            The Director Dashboard is branch-specific and never blends branches. Pick a branch from the
            top-right selector (it currently shows the consolidated <b>TK HO Group</b>).
          </p>
          {isOwner && (
            <button
              onClick={() => navigate('/dashboard/owner')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-white px-4 py-2 text-xs font-bold text-ink max-tablet:min-h-[44px]"
            >
              Open Owner Dashboard (all branches) →
            </button>
          )}
        </div>
      </PageLayout>
    );
  }

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Director Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={12} />;
  }

  const { revenueTrend, topCustomers, topSuppliers } = data;
  const fig = data.figures || { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 };
  const pb = data.pendingBookings || { count: 0, sales: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, gp: 0 };
  const rangeShort = period.label || 'Period';

  // derived live figures
  const assets = bs.assets || [], liabs = bs.liabilities || [];
  const aT = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const lT = liabs.reduce((s, a) => s + (a.amount || 0), 0);
  const balanced = Math.abs(aT - lT) < 1;
  const netWorth = liabs.filter((l) => /capital|reserve|profit|equity|surplus/i.test(l.group || l.name || '')).reduce((s, l) => s + (l.amount || 0), 0);
  const bankRows = (trial.rows || []).filter(isLiquidRow);
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0);
  const liquid = bankRows.reduce((s, r) => s + bal(r), 0) || fig.cash || totalCashInr;
  const arOverdue = age?.receivables?.totals?.d90 || 0;
  const mods = (mpl.modules || []).slice().sort((a, b) => (b.gp || 0) - (a.gp || 0));

  const pageTitle = consolidated ? 'Owner Dashboard' : 'Director Dashboard';
  // Owner follows the top-right selector: Group ⇒ consolidated all-branch; a
  // specific branch ⇒ that branch only. Director is always single-branch.
  const pageSubtitle = consolidated
    ? (effScope === 'ALL' ? 'Group view — all branches consolidated' : `Branch view — ${effScope} only`)
    : `Branch-specific view — ${effScope}`;

  return (
    <PageLayout>
      <DashboardHeader title={pageTitle} subtitle={pageSubtitle} user={currentUser} onExport={() => openPrintPreview({ selector: 'main', title: pageTitle, recommend: 'portrait' })} />
      {Controls}

      {/* ── Headline KPIs ── */}
      <ResponsiveGrid min="180px" gap="md" className="mb-4">
        <KPICard label="Cash & Bank" value={m0(liquid)} delta={liquid < 0 ? 'overdrawn' : 'liquid'} color={liquid < 0 ? C.red : '#16a34a'} onClick={() => navigate('/dashboards/cash')} />
        <KPICard label={`Revenue · ${rangeShort}`} value={m0(fig.revenue)} delta="" color="#c2a04a" onClick={() => navigate('/reports/pnl')} />
        <KPICard label="Gross Profit" value={m0(fig.gp)} delta={fig.gpPct ? `${fig.gpPct}% GP` : ''} color="#16a34a" onClick={() => navigate('/reports/gp')} />
        <KPICard label="Net Profit" value={m0(fig.netProfit)} delta={fig.revenue ? `${((fig.netProfit / fig.revenue) * 100).toFixed(1)}% margin` : ''} color={fig.netProfit >= 0 ? C.green : C.red} onClick={() => navigate('/reports/pnl')} />
        <KPICard label="Receivables" value={m0(fig.outstanding)} delta={arOverdue ? `${m0(arOverdue)} overdue 90+` : 'to collect'} color={arOverdue ? C.red : C.gold} onClick={() => navigate('/dashboards/arap')} />
        <KPICard label="Payables" value={m0(fig.payable)} delta="to pay" color={C.red} onClick={() => navigate('/dashboards/arap')} />
        <KPICard label="GST / Tax Net" value={m0(tax.netPayable || 0)} delta={(tax.netPayable || 0) >= 0 ? 'payable' : 'refundable'} color="#2563eb" onClick={() => navigate('/taxation')} />
        <KPICard label="Pending Approvals" value={m0(pb.sales)} delta={`${pb.count} awaiting`} color={pb.count ? '#d97706' : '#16a34a'} onClick={() => navigate('/transactions/approvals')} />
      </ResponsiveGrid>

      {/* ── Bookings pipeline (condensed) ── */}
      <div className="mb-1.5 text-xs font-semibold text-ink-muted">SO/PO/GP Pipeline · {rangeShort}</div>
      <ResponsiveGrid min="180px" gap="md" className="mb-4">
        <KPICard label="Approved Sales" value={m0(ab.sales)} delta={`${ab.count} posted`} color="#c2a04a" onClick={() => navigate('/transactions/approvals')} />
        <KPICard label="Approved GP" value={m0(ab.gp)} delta={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => navigate('/transactions/approvals')} />
        <KPICard label="Pending Sales" value={m0(pb.sales)} delta={`${pb.count} to approve`} color="#d97706" onClick={() => navigate('/transactions/approvals')} />
        <KPICard label="Pending GP" value={m0(pb.gp)} delta="not yet posted" color="#d97706" onClick={() => navigate('/transactions/approvals')} />
      </ResponsiveGrid>

      {/* ── Trend + Targets ── */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="Revenue Trend — 12 Months" subtitle={compare ? 'Current Year vs Last Year' : 'Current Year only'} onPin={() => togglePin('rev')} pinned={pinned.rev} onDrill={() => navigate('/reports/pnl')}>
          <RevenueTrendChart data={revenueTrend} compareLastYear={compare} onToggleCompare={setCompare} formatMoney={m0} />
        </WidgetCard>
        <WidgetCard title={`FY ${CUR_FY.label} Targets vs Actual`} onPin={() => togglePin('targets')} pinned={pinned.targets} onDrill={() => navigate('/dashboards/sales-target')}>
          {liveTargets.length
            ? <FyTargetsPanel targets={liveTargets} />
            : <div className="px-0.5 py-1 text-xs text-ink-muted">No targets set. Add them in <b>Finance ▸ Sales Targets</b>.</div>}
        </WidgetCard>
      </div>

      {/* ── GP by Module + Balance Sheet ── */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Gross Profit by Module" subtitle="Which products earn" onDrill={() => navigate('/dashboards/module-gp')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th scope="col" style={th}>Module</th><th scope="col" style={{ ...th, ...num }}>Sales</th><th scope="col" style={{ ...th, ...num }}>GP</th><th scope="col" style={{ ...th, ...num }}>GP %</th></tr></thead>
              <tbody>
                {mods.map((mm) => <tr key={mm.key}><td style={td}>{mm.name || mm.key}</td><td style={{ ...td, ...num }}>{m0(mm.sales)}</td><td style={{ ...td, ...num, fontWeight: 700, color: (mm.gp || 0) < 0 ? C.red : C.green }}>{m0(mm.gp)}</td><td style={{ ...td, ...num }}>{(mm.gpPct || 0).toFixed(1)}%</td></tr>)}
                {!mods.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>No data for this period.</td></tr>}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
        <WidgetCard title="Balance Sheet — Position" subtitle={`As on ${dates.to || 'today'}`} onDrill={() => navigate('/dashboards/balance-sheet')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={td}>Total Assets</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(aT)}</td></tr>
                <tr><td style={td}>Total Liabilities &amp; Capital</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(lT)}</td></tr>
                <tr><td style={td}>Net Worth (Capital + Reserves + P&amp;L)</td><td style={{ ...td, ...num, fontWeight: 700, color: netWorth < 0 ? C.red : C.green }}>{m0(netWorth)}</td></tr>
                <tr><td style={td}>Balanced</td><td style={{ ...td, ...num, fontWeight: 700, color: balanced ? C.green : C.red }}>{(aT || lT) ? (balanced ? '✓ Yes' : '✗ ' + m0(aT - lT)) : '—'}</td></tr>
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
      </div>

      {/* ── AR/AP Ageing + Cash & Bank ── */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Receivables / Payables Ageing" subtitle="As of today" onDrill={() => navigate('/dashboards/arap')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th scope="col" style={th}></th><th scope="col" style={{ ...th, ...num }}>0–30</th><th scope="col" style={{ ...th, ...num }}>30–60</th><th scope="col" style={{ ...th, ...num }}>60–90</th><th scope="col" style={{ ...th, ...num }}>90+</th><th scope="col" style={{ ...th, ...num }}>Total</th></tr></thead>
              <tbody>
                {[['Receivable', age.receivables?.totals], ['Payable', age.payables?.totals]].map(([lbl, t]) => (
                  <tr key={lbl}><td style={{ ...td, fontWeight: 700 }}>{lbl}</td><td style={{ ...td, ...num }}>{m0(t?.d0)}</td><td style={{ ...td, ...num }}>{m0(t?.d30)}</td><td style={{ ...td, ...num }}>{m0(t?.d60)}</td><td style={{ ...td, ...num, color: (t?.d90) ? C.red : undefined }}>{m0(t?.d90)}</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(t?.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
        <WidgetCard title="Cash & Bank" subtitle="Live balances" onDrill={() => navigate('/dashboards/cash')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {bankRows.map((r, i) => <tr key={i}><td style={td}>{r.ledger || r.name}</td><td style={{ ...td, ...num, fontWeight: 700, color: bal(r) < 0 ? C.red : C.dark }}>{m0(bal(r))}</td></tr>)}
                {!bankRows.length && <tr><td style={{ ...td, color: C.dim }}>Cash &amp; Bank (net)</td><td style={{ ...td, ...num, fontWeight: 700 }}>{m0(liquid)}</td></tr>}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
      </div>

      {/* ── Branch performance ── (alerts live on the dedicated Alerts Dashboard) */}
      <div className="mb-3.5">
        <WidgetCard title="Branch Performance" subtitle={`Sales · GP · Net Profit · ${rangeShort}`} onPin={() => togglePin('heat')} pinned={pinned.heat} onDrill={() => navigate('/dashboards/branch')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th scope="col" style={th}>Branch</th><th scope="col" style={{ ...th, ...num }}>Sales</th><th scope="col" style={{ ...th, ...num }}>GP</th><th scope="col" style={{ ...th, ...num }}>GP %</th><th scope="col" style={{ ...th, ...num }}>Net</th></tr></thead>
              <tbody>
                {branchRows.map((r) => <tr key={r.code}><td style={{ ...td, fontWeight: 700 }}>{r.code}</td><td style={{ ...td, ...num }}>{m0(r.sales)}</td><td style={{ ...td, ...num, color: r.gp < 0 ? C.red : C.green }}>{m0(r.gp)}</td><td style={{ ...td, ...num }}>{r.sales ? ((r.gp / r.sales) * 100).toFixed(1) : '0.0'}%</td><td style={{ ...td, ...num, fontWeight: 700, color: r.net < 0 ? C.red : C.dark }}>{m0(r.net)}</td></tr>)}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
      </div>

      {/* ── Top customers / suppliers ── */}
      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Top 10 Customers" onPin={() => togglePin('topcust')} pinned={pinned.topcust} onDrill={() => navigate('/masters/customers')}>
          <TopEntitiesTable rows={topCustomers} kind="customer" formatMoney={m0} />
        </WidgetCard>
        <WidgetCard title="Top 10 Suppliers" onPin={() => togglePin('topsup')} pinned={pinned.topsup} onDrill={() => navigate('/masters/suppliers')}>
          <TopEntitiesTable rows={topSuppliers} kind="supplier" valueKey="spend" countKey="vouchers" formatMoney={m0} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}

/**
 * Owner Dashboard — the whole-company CONSOLIDATED view (all branches), reusing
 * the Director Dashboard rendering with `consolidated` on. Access is restricted
 * to the owner (afshin.dhanani@kingsgroupco.com) at the route level (App.jsx) and
 * the menu is owner-only (getMenu). The Director Dashboard stays branch-specific.
 */
export function OwnerDashboardPage(props) {
  return <DirectorDashboardPage {...props} consolidated />;
}
