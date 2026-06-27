import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { CUR_FY } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { directorScope, branchListForScope, scopeBranchArg } from './director-dashboard.scope';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { PeriodBar, periodRange } from '../../../core/period';
import { BRANCHES } from '../../../core/data';
import { RevenueTrendChart } from '../components/shared/RevenueTrendChart';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';
import { useModulePL, useBalanceSheet, useAgeing, useTaxSummary, useTrialBalance, useTargetsVsActual } from '../../../core/useAccounting';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../../core/api';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';
import { isLiquidRow } from '../../../core/ledgerKind';

/**
 * OWNER DASHBOARD — whole-company financial view (owner-only, gated by email +
 * Super Admin in App.jsx / getMenu). Follows the top-right branch selector:
 *   • Group (TK HO Group) ⇒ consolidated, all branches.
 *   • a specific branch   ⇒ that branch's financials only.
 * Carries the financial/governance widgets (Balance Sheet, Net Worth, Cash &
 * Bank, Tax) that the role-scoped Director Dashboard deliberately omits.
 */
const C = { dark: '#14161a', dim: '#5b616e', green: '#16a34a', red: '#dc2626', gold: '#b45309', border: '#cdd1d8' };
const th = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
const td = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #dfe2e7' };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const Scroll = ({ children }) => <div style={{ overflowX: 'auto' }}>{children}</div>;

export function OwnerDashboardPage({ currentUser, setRoute, branch }) {
  const { navigate } = useDashboardActions(setRoute);
  // Owner follows the selector: Group ⇒ 'ALL' (consolidated); a branch ⇒ its code.
  const effScope = directorScope(branch);
  const compare = useDashboardStore((s) => s.compareLastYear);
  const setCompare = useDashboardStore((s) => s.setCompareLastYear);
  const pinned = useDashboardStore((s) => s.pinnedWidgets);
  const togglePin = useDashboardStore((s) => s.togglePinnedWidget);

  // Consolidated = Group/ALL scope: render money KPIs PER BRANCH (each in its own
  // currency), never one merged cross-branch ₹ total.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL' || effScope === 'ALL';
  const branchArg = scopeBranchArg(effScope);
  const [period, setPeriod] = React.useState(() => periodRange('all', { branch: branchArg }));
  const dates = period;
  const { data, totalCashInr, isLoading, isError, error, refetch } = useDirectorDashboard({ scope: effScope, from: period.from, to: period.to });
  const cur = bc(branch).cur;
  const m0 = (n) => compactAmt(Math.round(Number(n) || 0), { currency: cur });
  // Per-branch money formatter — value in the given branch CODE's own currency.
  const mB = (code, n) => compactAmt(Math.round(Number(n) || 0), { currency: bc({ code }).cur });
  const mpl = useModulePL(branchArg, { ...dates, summary: true }).data || {};
  const bs = useBalanceSheet(branchArg, { to: dates.to }).data || {};
  const age = useAgeing(branchArg).data || {};
  const tax = useTaxSummary(branchArg, dates).data || {};
  const trial = useTrialBalance(branchArg, dates).data || {};

  const fy = (() => { const d = new Date(); const y = d.getFullYear(); const s = d.getMonth() >= 3 ? y : y - 1; return `${s}-${String(s + 1).slice(-2)}`; })();
  const salesTot = useTargetsVsActual(branchArg, 'sales', { from: dates.from, to: dates.to, fy }).data?.totals;
  const gpTot = useTargetsVsActual(branchArg, 'gp', { from: dates.from, to: dates.to, fy }).data?.totals;
  const liveTargets = [
    { metric: 'Sales', actual: salesTot?.actual || 0, target: salesTot?.target || 0, unit: cur },
    { metric: 'Gross Profit', actual: gpTot?.actual || 0, target: gpTot?.target || 0, unit: cur },
  ].filter((t) => t.target > 0);

  // Per-branch comparison: Group ⇒ all branches; a branch ⇒ only that one.
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

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Owner Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={12} />;
  }

  const { revenueTrend, topCustomers, topSuppliers } = data;
  const fig = data.figures || { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 };
  const pb = data.pendingBookings || { count: 0, sales: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, gp: 0 };
  const rangeShort = period.label || 'Period';

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

  // ── Per-branch headline KPIs (Group/ALL scope only) ──
  // Stitch each money KPI from the matching hook's `byBranch` slice so every branch's
  // Cash & Bank / Revenue / GP / NP / Receivables / Payables / Tax prints in its OWN
  // currency — never a merged cross-currency ₹ sum. Keyed by branch code.
  const liquidOf = (rows) => (rows || []).filter(isLiquidRow).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);
  const perBranchKpis = React.useMemo(() => {
    if (!isAll) return [];
    const codes = [...new Set([
      ...(Array.isArray(mpl.byBranch) ? mpl.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(trial.byBranch) ? trial.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(bs.byBranch) ? bs.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(age.byBranch) ? age.byBranch : []).map((b) => b.branch),
    ])].filter(Boolean).sort();
    const byCode = (arr, code) => (Array.isArray(arr) ? arr.find((x) => x.branch === code) : null) || {};
    return codes.map((code) => {
      const p = byCode(mpl.byBranch, code);
      const tr = byCode(trial.byBranch, code);
      const b = byCode(bs.byBranch, code);
      const a = byCode(age.byBranch, code);
      const tx = byCode(tax.byBranch, code);
      const sales = p?.totals?.sales || 0, gp = p?.totals?.gp || 0, gpPct = sales ? (gp / sales) * 100 : 0;
      const net = p?.bridge?.netProfit || 0;
      // Cash & bank: prefer the branch trial-balance liquid rows; else fall back to BS assets liquid groups.
      const liquid = Array.isArray(tr?.rows)
        ? liquidOf(tr.rows)
        : (b.assets || []).filter((g) => /cash|bank/i.test(g.group || '')).reduce((s, g) => s + (g.amount || 0), 0);
      return {
        code,
        liquid,
        revenue: sales,
        gp, gpPct,
        net,
        outstanding: a?.receivables?.totals?.total || 0,
        arOverdue: a?.receivables?.totals?.d90 || 0,
        payable: a?.payables?.totals?.total || 0,
        taxNet: tx?.netPayable || 0,
      };
    });
  }, [isAll, mpl.byBranch, trial.byBranch, bs.byBranch, age.byBranch, tax.byBranch]);

  const pageSubtitle = effScope === 'ALL' ? 'Group view — all branches consolidated' : `Branch view — ${effScope} only`;

  return (
    <PageLayout>
      <DashboardHeader title="Owner Dashboard" subtitle={pageSubtitle} user={currentUser} onExport={() => openPrintPreview({ selector: 'main', title: 'Owner Dashboard', recommend: 'portrait' })} />
      {Controls}

      {/* ── Headline KPIs ──
          Group/ALL ⇒ money KPIs rendered PER BRANCH (each in its own currency); never a
          merged cross-branch ₹ total. Single-branch ⇒ the original consolidated cards. */}
      {isAll ? (
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold text-ink-muted">
            Group money KPIs — per branch, each in its own currency · <span className="font-normal">no cross-currency total</span>
          </div>
          {perBranchKpis.length === 0 && (
            <div className="rounded-brand border border-surface-border bg-surface px-3.5 py-4 text-xs text-ink-muted">No branch data for this period.</div>
          )}
          {perBranchKpis.map((r) => (
            <div key={r.code} className="mb-3">
              <div className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-1" style={{ borderColor: '#185FA5' }}>
                <span className="text-sm font-extrabold text-ink">{r.code}</span>
                <span className="text-[11px] font-bold text-ink-muted">· {bc({ code: r.code }).cur}</span>
              </div>
              <ResponsiveGrid min="180px" gap="md">
                <KPICard label="Cash & Bank" value={mB(r.code, r.liquid)} delta={r.liquid < 0 ? 'overdrawn' : 'liquid'} color={r.liquid < 0 ? C.red : '#16a34a'} onClick={() => navigate('/dashboards/cash')} />
                <KPICard label={`Revenue · ${rangeShort}`} value={mB(r.code, r.revenue)} delta="" color="#c2a04a" onClick={() => navigate('/reports/pnl')} />
                <KPICard label="Gross Profit" value={mB(r.code, r.gp)} delta={r.gpPct ? `${r.gpPct.toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => navigate('/reports/gp')} />
                <KPICard label="Net Profit" value={mB(r.code, r.net)} delta={r.revenue ? `${((r.net / r.revenue) * 100).toFixed(1)}% margin` : ''} color={r.net >= 0 ? C.green : C.red} onClick={() => navigate('/reports/pnl')} />
                <KPICard label="Receivables" value={mB(r.code, r.outstanding)} delta={r.arOverdue ? `${mB(r.code, r.arOverdue)} overdue 90+` : 'to collect'} color={r.arOverdue ? C.red : C.gold} onClick={() => navigate('/dashboards/arap')} />
                <KPICard label="Payables" value={mB(r.code, r.payable)} delta="to pay" color={C.red} onClick={() => navigate('/dashboards/arap')} />
                <KPICard label="GST / Tax Net" value={mB(r.code, r.taxNet)} delta={r.taxNet >= 0 ? 'payable' : 'refundable'} color="#2563eb" onClick={() => navigate('/taxation')} />
              </ResponsiveGrid>
            </div>
          ))}
        </div>
      ) : (
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
      )}

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

      {/* ── Branch performance ── */}
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
