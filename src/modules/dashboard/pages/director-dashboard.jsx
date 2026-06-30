import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { CUR_FY } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { directorScope, scopeBranchArg } from './director-dashboard.scope';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { PeriodBar, periodRange } from '../../../core/period';
import { BRANCHES } from '../../../core/data';
import { RevenueTrendChart } from '../components/shared/RevenueTrendChart';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { ConsultantLeaderboard } from '../components/shared/ConsultantLeaderboard';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';
import { useModulePL, useAgeing, useTargetsVsActual } from '../../../core/useAccounting';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../../core/api';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';

/**
 * DIRECTOR DASHBOARD — branch operations & performance view (role-scoped).
 * Distinct from the Owner Dashboard (which carries the consolidated financials:
 * Balance Sheet, Net Worth, Cash). This one is performance/ops only.
 *
 * Follows the top-right branch selector:
 *   • a branch (e.g. BOM) ⇒ that branch's performance data.
 *   • Group (TK HO Group) ⇒ all-branch CONSOLIDATED performance + a branch
 *     performance scoreboard (league table) comparing every branch.
 */
const C = { dark: '#14161a', dim: '#5b616e', green: '#16a34a', red: '#dc2626', gold: '#b45309', border: '#cdd1d8' };
const th = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
const td = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #dfe2e7' };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const Scroll = ({ children }) => <div style={{ overflowX: 'auto' }}>{children}</div>;

export function DirectorDashboardPage({ currentUser, setRoute, branch }) {
  const { navigate } = useDashboardActions(setRoute);
  // Selector → scope. Group ⇒ 'ALL' (consolidated all-branch); a branch ⇒ its code.
  const effScope = directorScope(branch);
  const isGroup = effScope === 'ALL';
  const compare = useDashboardStore((s) => s.compareLastYear);
  const setCompare = useDashboardStore((s) => s.setCompareLastYear);
  const pinned = useDashboardStore((s) => s.pinnedWidgets);
  const togglePin = useDashboardStore((s) => s.togglePinnedWidget);

  const branchArg = scopeBranchArg(effScope);
  const [period, setPeriod] = React.useState(() => periodRange('all', { branch: branchArg }));
  const dates = period;
  const { data, isLoading, isError, error, refetch } = useDirectorDashboard({ scope: effScope, from: period.from, to: period.to });
  const cur = bc(branch).cur;
  const m0 = (n) => compactAmt(Math.round(Number(n) || 0), { currency: cur });
  // Per-branch money formatter — value in the given branch CODE's own currency.
  const mB = (code, n) => compactAmt(Math.round(Number(n) || 0), { currency: bc({ code }).cur });
  const mpl = useModulePL(branchArg, { ...dates, summary: true }).data || {};
  const age = useAgeing(branchArg).data || {};

  // Live FY targets (Sales + GP) — scoped to the selector.
  const fy = (() => { const d = new Date(); const y = d.getFullYear(); const s = d.getMonth() >= 3 ? y : y - 1; return `${s}-${String(s + 1).slice(-2)}`; })();
  const salesTot = useTargetsVsActual(branchArg, 'sales', { from: dates.from, to: dates.to, fy }).data?.totals;
  const gpTot = useTargetsVsActual(branchArg, 'gp', { from: dates.from, to: dates.to, fy }).data?.totals;
  const liveTargets = [
    { metric: 'Sales', actual: salesTot?.actual || 0, target: salesTot?.target || 0, unit: cur },
    { metric: 'Gross Profit', actual: gpTot?.actual || 0, target: gpTot?.target || 0, unit: cur },
  ].filter((t) => t.target > 0);

  // Branch scoreboard — only fetched in Group mode (one query per branch).
  const brList = BRANCHES.filter((b) => b.code);
  const bq = useQueries({ queries: brList.map((b) => ({ queryKey: ['accounting', 'module-pl', b.code, dates.from, dates.to, 'summary'], queryFn: () => apiGet('/api/accounting/module-pl', { branch: b.code, from: dates.from, to: dates.to, summary: 1 }), enabled: isGroup })) });
  const branchRows = brList.map((b, i) => { const d = bq[i].data || {}; return { code: b.code, sales: d?.totals?.sales || 0, gp: d?.totals?.gp || 0, net: d?.bridge?.netProfit || 0 }; });

  // ── Per-branch performance KPIs (Group/ALL scope only) ──
  // Money KPIs in Group mode render PER BRANCH (each in its own currency) — never a
  // merged cross-branch ₹ sum. Stitched from useModulePL.byBranch (Revenue/GP/NP) and
  // useAgeing.byBranch (Receivables/Payables), keyed by branch code.
  // Declared ABOVE the isError/isLoading early returns so the hook order is stable
  // across loading→loaded renders (a useMemo after an early return throws React #300).
  const perBranchKpis = React.useMemo(() => {
    if (!isGroup) return [];
    const codes = [...new Set([
      ...(Array.isArray(mpl.byBranch) ? mpl.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(age.byBranch) ? age.byBranch : []).map((b) => b.branch),
    ])].filter(Boolean).sort();
    const byCode = (arr, code) => (Array.isArray(arr) ? arr.find((x) => x.branch === code) : null) || {};
    return codes.map((code) => {
      const p = byCode(mpl.byBranch, code);
      const a = byCode(age.byBranch, code);
      const sales = p?.totals?.sales || 0, gp = p?.totals?.gp || 0, gpPct = sales ? (gp / sales) * 100 : 0;
      return {
        code,
        revenue: sales,
        gp, gpPct,
        net: p?.bridge?.netProfit || 0,
        outstanding: a?.receivables?.totals?.total || 0,
        arOverdue: a?.receivables?.totals?.d90 || 0,
        payable: a?.payables?.totals?.total || 0,
      };
    });
  }, [isGroup, mpl.byBranch, age.byBranch]);

  const Controls = (
    <div className="mb-3.5 mt-1 flex flex-wrap items-center gap-2.5">
      <PeriodBar branch={branchArg} defaultPreset="all" onChange={setPeriod} />
      <span className="py-1 text-[11px] font-bold text-ink-muted">
        Scope: {isGroup ? 'All branches (Consolidated)' : effScope} — set via the branch selector (top-right)
      </span>
    </div>
  );

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Director Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={6} columns={2} />;
  }

  const { revenueTrend, topCustomers, topConsultants = [] } = data;
  const fig = data.figures || { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0 };
  const pb = data.pendingBookings || { count: 0, sales: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, gp: 0 };
  const rangeShort = period.label || 'Period';
  const arOverdue = age?.receivables?.totals?.d90 || 0;
  const mods = (mpl.modules || []).slice().sort((a, b) => (b.gp || 0) - (a.gp || 0));

  // Scoreboard rows: best → worst by net profit, with each branch's contribution
  // to group sales (only meaningful in Group mode).
  const totSales = branchRows.reduce((s, r) => s + r.sales, 0) || 1;
  const ranked = branchRows.slice().sort((a, b) => b.net - a.net);

  const pageSubtitle = isGroup
    ? 'Group — all-branch performance (consolidated)'
    : `Branch performance — ${effScope}`;

  return (
    <PageLayout>
      <DashboardHeader title="Director Dashboard" subtitle={pageSubtitle} user={currentUser} onExport={() => openPrintPreview({ selector: 'main', title: 'Director Dashboard', recommend: 'portrait' })} />
      {Controls}

      {/* ── Performance KPIs (no balance-sheet / cash — those live on the Owner Dashboard) ──
          Group/ALL ⇒ money KPIs rendered PER BRANCH (each in its own currency); never a
          merged cross-branch ₹ total. Single-branch ⇒ the original consolidated cards. */}
      {isGroup ? (
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold text-ink-muted">
            Group performance KPIs — per branch, each in its own currency · <span className="font-normal">no cross-currency total</span>
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
                <KPICard label={`Revenue · ${rangeShort}`} value={mB(r.code, r.revenue)} delta="" color="#c2a04a" onClick={() => navigate('/reports/pnl')} />
                <KPICard label="Gross Profit" value={mB(r.code, r.gp)} delta={r.gpPct ? `${r.gpPct.toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => navigate('/reports/gp')} />
                <KPICard label="Net Profit" value={mB(r.code, r.net)} delta={r.revenue ? `${((r.net / r.revenue) * 100).toFixed(1)}% margin` : ''} color={r.net >= 0 ? C.green : C.red} onClick={() => navigate('/reports/pnl')} />
                <KPICard label="Receivables" value={mB(r.code, r.outstanding)} delta={r.arOverdue ? `${mB(r.code, r.arOverdue)} overdue 90+` : 'to collect'} color={r.arOverdue ? C.red : C.gold} onClick={() => navigate('/dashboards/arap')} />
                <KPICard label="Payables" value={mB(r.code, r.payable)} delta="to pay" color={C.red} onClick={() => navigate('/dashboards/arap')} />
              </ResponsiveGrid>
            </div>
          ))}
        </div>
      ) : (
        <ResponsiveGrid min="180px" gap="md" className="mb-4">
          <KPICard label={`Revenue · ${rangeShort}`} value={m0(fig.revenue)} delta="" color="#c2a04a" onClick={() => navigate('/reports/pnl')} />
          <KPICard label="Gross Profit" value={m0(fig.gp)} delta={fig.gpPct ? `${fig.gpPct}% GP` : ''} color="#16a34a" onClick={() => navigate('/reports/gp')} />
          <KPICard label="Net Profit" value={m0(fig.netProfit)} delta={fig.revenue ? `${((fig.netProfit / fig.revenue) * 100).toFixed(1)}% margin` : ''} color={fig.netProfit >= 0 ? C.green : C.red} onClick={() => navigate('/reports/pnl')} />
          <KPICard label="Receivables" value={m0(fig.outstanding)} delta={arOverdue ? `${m0(arOverdue)} overdue 90+` : 'to collect'} color={arOverdue ? C.red : C.gold} onClick={() => navigate('/dashboards/arap')} />
          <KPICard label="Payables" value={m0(fig.payable)} delta="to pay" color={C.red} onClick={() => navigate('/dashboards/arap')} />
          <KPICard label="Pending Approvals" value={String(pb.count)} delta={pb.count ? `${m0(pb.sales)} value` : 'all clear'} color={pb.count ? '#d97706' : '#16a34a'} onClick={() => navigate('/transactions/approvals')} />
        </ResponsiveGrid>
      )}

      {/* ── Bookings pipeline ── on Group/ALL: per branch, each in its own currency
          (Sales/GP money never summed across branches). */}
      <div className="mb-1.5 text-xs font-semibold text-ink-muted">SO/PO/GP Pipeline · {rangeShort}</div>
      {isGroup && Array.isArray(data.bookingsByBranch) ? (
        <div className="mb-4">
          {data.bookingsByBranch.length === 0 && (
            <div className="rounded-brand border border-surface-border bg-surface px-3.5 py-4 text-xs text-ink-muted">No pipeline bookings in any branch.</div>
          )}
          {data.bookingsByBranch.map((b) => (
            <div key={b.branch} className="mb-3">
              <div className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-1" style={{ borderColor: '#185FA5' }}>
                <span className="text-sm font-extrabold text-ink">{b.branch}</span>
                <span className="text-[11px] font-bold text-ink-muted">· {bc({ code: b.branch }).cur}</span>
              </div>
              <ResponsiveGrid min="180px" gap="md">
                <KPICard label="Approved Sales" value={mB(b.branch, b.approved.sales)} delta={`${b.approved.count} posted`} color="#c2a04a" onClick={() => navigate('/transactions/approvals')} />
                <KPICard label="Approved GP" value={mB(b.branch, b.approved.gp)} delta={b.approved.sales > 0 ? `${((b.approved.gp / b.approved.sales) * 100).toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => navigate('/transactions/approvals')} />
                <KPICard label="Pending Sales" value={mB(b.branch, b.pending.sales)} delta={`${b.pending.count} to approve`} color="#d97706" onClick={() => navigate('/transactions/approvals')} />
                <KPICard label="Pending GP" value={mB(b.branch, b.pending.gp)} delta="not yet posted" color="#d97706" onClick={() => navigate('/transactions/approvals')} />
              </ResponsiveGrid>
            </div>
          ))}
        </div>
      ) : (
        <ResponsiveGrid min="180px" gap="md" className="mb-4">
          <KPICard label="Approved Sales" value={m0(ab.sales)} delta={`${ab.count} posted`} color="#c2a04a" onClick={() => navigate('/transactions/approvals')} />
          <KPICard label="Approved GP" value={m0(ab.gp)} delta={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => navigate('/transactions/approvals')} />
          <KPICard label="Pending Sales" value={m0(pb.sales)} delta={`${pb.count} to approve`} color="#d97706" onClick={() => navigate('/transactions/approvals')} />
          <KPICard label="Pending GP" value={m0(pb.gp)} delta="not yet posted" color="#d97706" onClick={() => navigate('/transactions/approvals')} />
        </ResponsiveGrid>
      )}

      {/* ── Group-only: branch performance scoreboard ── */}
      {isGroup && (
        <div className="mb-3.5">
          <WidgetCard title="Branch Performance Scoreboard" subtitle="Best → worst by Net Profit · contribution to group sales" color="#185FA5" onDrill={() => navigate('/dashboards/branch')}>
            <Scroll>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th scope="col" style={th}>#</th><th scope="col" style={th}>Branch</th><th scope="col" style={{ ...th, ...num }}>Sales</th><th scope="col" style={{ ...th, ...num }}>GP</th><th scope="col" style={{ ...th, ...num }}>GP %</th><th scope="col" style={{ ...th, ...num }}>Net</th><th scope="col" style={{ ...th, ...num }}>Contrib.</th></tr></thead>
                <tbody>
                  {ranked.map((r, i) => (
                    <tr key={r.code}>
                      <td style={{ ...td, color: C.dim, width: 28 }}>{i + 1}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{r.code}</td>
                      <td style={{ ...td, ...num }}>{m0(r.sales)}</td>
                      <td style={{ ...td, ...num, color: r.gp < 0 ? C.red : C.green }}>{m0(r.gp)}</td>
                      <td style={{ ...td, ...num }}>{r.sales ? ((r.gp / r.sales) * 100).toFixed(1) : '0.0'}%</td>
                      <td style={{ ...td, ...num, fontWeight: 700, color: r.net < 0 ? C.red : C.dark }}>{m0(r.net)}</td>
                      <td style={{ ...td, ...num, color: C.dim }}>{((r.sales / totSales) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                  {!ranked.some((r) => r.sales || r.gp || r.net) && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>No branch data for this period.</td></tr>}
                </tbody>
              </table>
            </Scroll>
          </WidgetCard>
        </div>
      )}

      {/* ── Trend + Targets ── */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="Revenue Trend — 12 Months" subtitle={compare ? 'Current Year vs Last Year' : 'Current Year only'} color="#c2a04a" onPin={() => togglePin('rev')} pinned={pinned.rev} onDrill={() => navigate('/reports/pnl')}>
          <RevenueTrendChart data={revenueTrend} compareLastYear={compare} onToggleCompare={setCompare} formatMoney={m0} />
        </WidgetCard>
        <WidgetCard title={`FY ${CUR_FY.label} Targets vs Actual`} color="#c2a04a" onPin={() => togglePin('targets')} pinned={pinned.targets} onDrill={() => navigate('/dashboards/sales-target')}>
          {liveTargets.length
            ? <FyTargetsPanel targets={liveTargets} />
            : <div className="px-0.5 py-1 text-xs text-ink-muted">No targets set. Add them in <b>Finance ▸ Sales Targets</b>.</div>}
        </WidgetCard>
      </div>

      {/* ── GP by Module + Consultant leaderboard (team performance) ── */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Gross Profit by Module" subtitle="Which products earn" color="#16a34a" onDrill={() => navigate('/dashboards/module-gp')}>
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
        <WidgetCard title="Consultant Leaderboard" subtitle={isGroup ? 'Top earners · all branches' : `Top earners · ${effScope}`} color="#185FA5" onDrill={() => navigate('/reports/gp')}>
          <ConsultantLeaderboard consultants={topConsultants} formatMoney={m0} onViewAll={() => navigate('/reports/gp')} />
        </WidgetCard>
      </div>

      {/* ── AR/AP Ageing (collections) + Top customers ── */}
      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Receivables / Payables Ageing" subtitle="As of today" color="#dc2626" onDrill={() => navigate('/dashboards/arap')}>
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
        <WidgetCard title="Top 10 Customers" color="#185FA5" onPin={() => togglePin('topcust')} pinned={pinned.topcust} onDrill={() => navigate('/masters/customers')}>
          <TopEntitiesTable rows={topCustomers} kind="customer" formatMoney={m0} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
