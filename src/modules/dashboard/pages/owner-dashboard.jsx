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
import { KeyAlertsPanel } from '../components/shared/KeyAlertsPanel';
import { PnlWaterfallPanel } from '../components/shared/PnlWaterfallPanel';
import { CashForecastPanel } from '../components/shared/CashForecastPanel';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';
import { useModulePL, useBalanceSheet, useAgeing, useTaxSummary, useTrialBalance, useTargetsVsActual } from '../../../core/useAccounting';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';
import { isLiquidRow } from '../../../core/ledgerKind';
import { ArApSettlementView } from '../../../core/ArApSettlementView';

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

// The four financial-detail tables (GP-by-Module · Balance Sheet · AR/AP Ageing · Cash &
// Bank). Rendered ONCE with the merged figures for a single branch, or ONCE PER BRANCH in
// Group/ALL scope (each fed its own `byBranch` slice + its own-currency `fmt`) so a
// consolidated view never sums ₹ and USD into one number — same rule the KPI cards follow.
// `fmt` is the per-branch money formatter; we never FX-convert (inter-branch FX is manual).
function FinancialTables({ mods = [], assets = [], liabs = [], rec, pay, recRows = [], payRows = [], bankRows = [], liquidFallback = 0, dateTo, fmt, nav }) {
  const aT = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const lT = liabs.reduce((s, a) => s + (a.amount || 0), 0);
  const balanced = Math.abs(aT - lT) < 1;
  const netWorth = liabs.filter((l) => /capital|reserve|profit|equity|surplus/i.test(l.group || l.name || '')).reduce((s, l) => s + (l.amount || 0), 0);
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0);
  return (
    <>
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Gross Profit by Module" subtitle="Which products earn" color="#16a34a" onDrill={() => nav('/dashboards/module-gp')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th scope="col" style={th}>Module</th><th scope="col" style={{ ...th, ...num }}>Sales</th><th scope="col" style={{ ...th, ...num }}>GP</th><th scope="col" style={{ ...th, ...num }}>GP %</th></tr></thead>
              <tbody>
                {mods.map((mm) => <tr key={mm.key || mm.name}><td style={td}>{mm.name || mm.key}</td><td style={{ ...td, ...num }}>{fmt(mm.sales)}</td><td style={{ ...td, ...num, fontWeight: 700, color: (mm.gp || 0) < 0 ? C.red : C.green }}>{fmt(mm.gp)}</td><td style={{ ...td, ...num }}>{(mm.gpPct || 0).toFixed(1)}%</td></tr>)}
                {!mods.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>No data for this period.</td></tr>}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
        <WidgetCard title="Balance Sheet — Position" subtitle={`As on ${dateTo || 'today'}`} color="#185FA5" onDrill={() => nav('/dashboards/balance-sheet')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={td}>Total Assets</td><td style={{ ...td, ...num, fontWeight: 700 }}>{fmt(aT)}</td></tr>
                <tr><td style={td}>Total Liabilities &amp; Capital</td><td style={{ ...td, ...num, fontWeight: 700 }}>{fmt(lT)}</td></tr>
                <tr><td style={td}>Net Worth (Capital + Reserves + P&amp;L)</td><td style={{ ...td, ...num, fontWeight: 700, color: netWorth < 0 ? C.red : C.green }}>{fmt(netWorth)}</td></tr>
                <tr><td style={td}>Balanced</td><td style={{ ...td, ...num, fontWeight: 700, color: balanced ? C.green : C.red }}>{(aT || lT) ? (balanced ? '✓ Yes' : '✗ ' + fmt(aT - lT)) : '—'}</td></tr>
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
      </div>

      {/* Ageing & Settlement — two independent cards (Receivables / Payables). Each shows
          the six settlement metrics as tabs and, below, the fine-bucket ageing of Unsettled
          Bills per ledger (Final Total reconciles to the Unsettled Bills tile). Same no-FIFO
          truth the AR/AP reports settle against — the reports carry the identical view. */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Receivables — Ageing & Settlement" subtitle="Bills · settled · unsettled · ageing by sub-group" color="#dc2626" onDrill={() => nav('/reports/rec')}>
          <ArApSettlementView side="receivable" totals={rec || {}} rows={recRows} formatMoney={fmt} collapsed />
        </WidgetCard>
        <WidgetCard title="Payables — Ageing & Settlement" subtitle="Bills · settled · unsettled · ageing by sub-group" color="#16a34a" onDrill={() => nav('/reports/pay')}>
          <ArApSettlementView side="payable" totals={pay || {}} rows={payRows} formatMoney={fmt} collapsed />
        </WidgetCard>
      </div>
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Cash & Bank" subtitle="Live balances" color="#16a34a" onDrill={() => nav('/dashboards/cash')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {bankRows.map((r, i) => <tr key={i}><td style={td}>{r.ledger || r.name}</td><td style={{ ...td, ...num, fontWeight: 700, color: bal(r) < 0 ? C.red : C.dark }}>{fmt(bal(r))}</td></tr>)}
                {!bankRows.length && <tr><td style={{ ...td, color: C.dim }}>Cash &amp; Bank (net)</td><td style={{ ...td, ...num, fontWeight: 700 }}>{fmt(liquidFallback)}</td></tr>}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
      </div>
    </>
  );
}

export function OwnerDashboardPage({ currentUser, setRoute, branch, setBranch }) {
  const { navigate } = useDashboardActions(setRoute);
  // Per-branch drill: in Group view, switch the global branch selector to the clicked
  // branch THEN navigate, so the destination report opens scoped to THAT branch (not the
  // consolidated all-branch view). Falls back to a plain navigate when setBranch is absent.
  const drillBranch = (code, route) => {
    const b = BRANCHES.find((x) => x.code === code);
    if (b && setBranch) setBranch(b);
    navigate(route);
  };
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

  // Branch Performance scoreboard — sourced from the module-PL `byBranch` breakdown the
  // dashboard ALREADY fetched (Group), or the selected branch's own totals (single-branch).
  // No separate per-branch fanout: the rows match the per-branch KPI cards exactly and we
  // save N redundant /module-pl round-trips.
  const branchRows = isAll
    ? (Array.isArray(mpl.byBranch) ? mpl.byBranch : []).map((b) => ({ code: b.branch, sales: b.totals?.sales || 0, gp: b.totals?.gp || 0, net: b.bridge?.netProfit || 0 }))
    : [{ code: effScope, sales: mpl.totals?.sales || 0, gp: mpl.totals?.gp || 0, net: mpl.bridge?.netProfit || 0 }];

  // ── Per-branch headline KPIs (Group/ALL scope only) ──
  // Stitch each money KPI from the matching hook's `byBranch` slice so every branch's
  // Cash & Bank / Revenue / GP / NP / Receivables / Payables / Tax prints in its OWN
  // currency — never a merged cross-currency ₹ sum. Keyed by branch code.
  // Declared ABOVE the isError/isLoading early returns so the hook order is stable
  // across loading→loaded renders (a useMemo after an early return throws React #300).
  const liquidOf = (rows) => (rows || []).filter(isLiquidRow).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);
  const perBranchKpis = React.useMemo(() => {
    if (!isAll) return [];
    const codes = [...new Set([
      ...(Array.isArray(mpl.byBranch) ? mpl.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(trial.byBranch) ? trial.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(bs.byBranch) ? bs.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(age.byBranch) ? age.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(tax.byBranch) ? tax.byBranch : []).map((b) => b.branch),
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

  const Controls = (
    <div className="mb-3.5 mt-1 flex flex-wrap items-center gap-2.5">
      <PeriodBar branch={branchArg} defaultPreset="all" onChange={setPeriod} />
      <span className="py-1 text-[11px] font-bold text-ink-muted">
        Scope: {effScope === 'ALL' ? 'All branches (Consolidated)' : effScope} — set via the branch selector (top-right)
      </span>
    </div>
  );

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the AD Dashboard (All)." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={12} />;
  }

  const { revenueTrend, topCustomers, topSuppliers, topConsultants = [], keyAlerts = [] } = data;
  const fig = data.figures || { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 };
  const pb = data.pendingBookings || { count: 0, sales: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, gp: 0 };
  const rangeShort = period.label || 'Period';

  const assets = bs.assets || [], liabs = bs.liabilities || [];
  const bankRows = (trial.rows || []).filter(isLiquidRow);
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0);
  const liquid = bankRows.reduce((s, r) => s + bal(r), 0) || fig.cash || totalCashInr;
  const arOverdue = age?.receivables?.totals?.d90 || 0;
  const mods = (mpl.modules || []).slice().sort((a, b) => (b.gp || 0) - (a.gp || 0));

  // Per-branch slice accessors for the consolidated financial-detail tables (Group/ALL):
  // each branch's GP-by-module / balance sheet / ageing / cash from its own `byBranch`
  // slice, so the Group view renders them per branch (own currency) — never a ₹+USD merge.
  const byCode = (arr, code) => (Array.isArray(arr) ? arr.find((x) => x.branch === code) : null) || {};
  const branchFin = (code) => {
    const p = byCode(mpl.byBranch, code), b = byCode(bs.byBranch, code), a = byCode(age.byBranch, code), tr = byCode(trial.byBranch, code);
    return {
      mods: (p.modules || []).slice().sort((x, y) => (y.gp || 0) - (x.gp || 0)),
      assets: b.assets || [], liabs: b.liabilities || [],
      rec: a.receivables?.totals, pay: a.payables?.totals,
      recRows: a.receivables?.rows || [], payRows: a.payables?.rows || [],
      bankRows: (tr.rows || []).filter(isLiquidRow),
    };
  };

  const pageSubtitle = effScope === 'ALL' ? 'Group view — all branches consolidated' : `Branch view — ${effScope} only`;

  return (
    <PageLayout>
      <DashboardHeader title="AD Dashboard (All)" subtitle={pageSubtitle} user={currentUser} onExport={() => openPrintPreview({ selector: 'main', title: 'AD Dashboard (All)', recommend: 'portrait' })} />
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
                <KPICard label="Cash & Bank" value={mB(r.code, r.liquid)} delta={r.liquid < 0 ? 'overdrawn' : 'liquid'} color={r.liquid < 0 ? C.red : '#16a34a'} onClick={() => drillBranch(r.code, '/dashboards/cash')} />
                <KPICard label={`Revenue · ${rangeShort}`} value={mB(r.code, r.revenue)} delta="" color="#c2a04a" onClick={() => drillBranch(r.code, '/reports/pnl')} />
                <KPICard label="Gross Profit" value={mB(r.code, r.gp)} delta={r.gpPct ? `${r.gpPct.toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => drillBranch(r.code, '/reports/gp')} />
                <KPICard label="Net Profit" value={mB(r.code, r.net)} delta={r.revenue ? `${((r.net / r.revenue) * 100).toFixed(1)}% margin` : ''} color={r.net >= 0 ? C.green : C.red} onClick={() => drillBranch(r.code, '/reports/pnl')} />
                <KPICard label="Receivables" value={mB(r.code, r.outstanding)} delta={r.arOverdue ? `${mB(r.code, r.arOverdue)} overdue 90+` : 'to collect'} color={r.arOverdue ? C.red : C.gold} onClick={() => drillBranch(r.code, '/dashboards/arap')} />
                <KPICard label="Payables" value={mB(r.code, r.payable)} delta="to pay" color={C.red} onClick={() => drillBranch(r.code, '/dashboards/arap')} />
                <KPICard label="GST / Tax Net" value={mB(r.code, r.taxNet)} delta={r.taxNet >= 0 ? 'payable' : 'refundable'} color="#2563eb" onClick={() => drillBranch(r.code, '/reports/tax-summary')} />
              </ResponsiveGrid>
            </div>
          ))}
        </div>
      ) : (
        <ResponsiveGrid min="180px" gap="md" className="mb-4">
          <KPICard label="Cash & Bank" value={m0(liquid)} delta={liquid < 0 ? 'overdrawn' : 'liquid'} color={liquid < 0 ? C.red : '#16a34a'} onClick={() => navigate('/dashboards/cash')} />
          <KPICard label={`Revenue · ${rangeShort}`} value={m0(fig.revenue)} delta="" color="#c2a04a" onClick={() => navigate('/reports/pnl')} />
          <KPICard label="Gross Profit" value={m0(fig.gp)} delta={fig.gpPct ? `${Number(fig.gpPct).toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => navigate('/reports/gp')} />
          <KPICard label="Net Profit" value={m0(fig.netProfit)} delta={fig.revenue ? `${((fig.netProfit / fig.revenue) * 100).toFixed(1)}% margin` : ''} color={fig.netProfit >= 0 ? C.green : C.red} onClick={() => navigate('/reports/pnl')} />
          <KPICard label="Receivables" value={m0(fig.outstanding)} delta={arOverdue ? `${m0(arOverdue)} overdue 90+` : 'to collect'} color={arOverdue ? C.red : C.gold} onClick={() => navigate('/dashboards/arap')} />
          <KPICard label="Payables" value={m0(fig.payable)} delta="to pay" color={C.red} onClick={() => navigate('/dashboards/arap')} />
          <KPICard label="GST / Tax Net" value={m0(tax.netPayable || 0)} delta={(tax.netPayable || 0) >= 0 ? 'payable' : 'refundable'} color="#2563eb" onClick={() => navigate('/reports/tax-summary')} />
          <KPICard label="Pending Approvals" value={m0(pb.sales)} delta={`${pb.count} awaiting`} color={pb.count ? '#d97706' : '#16a34a'} onClick={() => navigate('/transactions/approvals')} />
        </ResponsiveGrid>
      )}

      {/* ── Sales Reconciliation (single-branch only — no cross-currency merge on Group) ──
          Proves the Revenue KPI BY ORIGIN: Revenue = SO/PO/GP + INB − Refund/Reissue
          (+ Other/Manual). Same Sales-Accounts source as the Revenue card, so it foots
          to the rupee; each line drills into its Approvals register. */}
      {!isAll && data.salesRecon && (data.salesRecon.buckets || []).length > 0 && (data.salesRecon.revenue || data.salesRecon.bucketSum) ? (
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold text-ink-muted">
            Sales Reconciliation · {rangeShort} <span className="font-normal">— how the Revenue figure is composed</span>
          </div>
          <div className="rounded-brand border border-surface-border bg-surface px-4 py-3">
            <div className="flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: '#185FA5' }}>
              <span className="text-sm font-extrabold text-ink">Revenue · {rangeShort}</span>
              <span className="text-lg font-extrabold tabular-nums" style={{ color: '#c2a04a' }}>{m0(data.salesRecon.revenue)}</span>
            </div>
            {data.salesRecon.buckets.map((b) => {
              // Operator + colour follow the SIGNED amount (refund is naturally negative),
              // and we render the absolute value so a subtracted line reads "− ₹21.8L",
              // not a confusing "− … -₹21.8L". Empty catch-all (Other = 0) is inert & dim.
              const neg = b.amount < 0;
              const empty = b.amount === 0 && b.count === 0;
              const inner = (
                <>
                  <span className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className="w-3 text-center font-bold" style={{ color: neg ? C.red : C.green }}>{neg ? '−' : '+'}</span>
                    {b.label}
                    {b.count ? <span className="text-[11px] text-ink-muted">· {b.count}</span> : null}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${empty ? 'text-ink-muted' : 'text-ink'}`}>{m0(Math.abs(b.amount))}</span>
                </>
              );
              return empty ? (
                <div key={b.key} className="flex w-full items-center justify-between py-1.5 opacity-60">{inner}</div>
              ) : (
                <button key={b.key} type="button" onClick={() => navigate(`/transactions/approvals?tab=${b.key}`)} className="flex w-full items-center justify-between py-1.5 text-left hover:opacity-80">{inner}</button>
              );
            })}
            {!data.salesRecon.reconciles && (
              <div className="mt-1 rounded border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: C.red, color: C.red }}>
                Unreconciled by {m0(Math.abs(data.salesRecon.residual))} — a Sales-ledger posting isn't classified; see the Other/Manual bucket.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Bookings pipeline (condensed) ── on Group/ALL: per branch, each in its own
          currency (Sales/GP money never summed across branches). */}
      <div className="mb-1.5 text-xs font-semibold text-ink-muted">SO/PO/GP Pipeline · {rangeShort}</div>
      {isAll && Array.isArray(data.bookingsByBranch) ? (
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
                <KPICard label="Approved Sales" value={mB(b.branch, b.approved.sales)} delta={`${b.approved.count} posted`} color="#c2a04a" onClick={() => drillBranch(b.branch, '/transactions/approvals')} />
                <KPICard label="Approved GP" value={mB(b.branch, b.approved.gp)} delta={b.approved.sales > 0 ? `${((b.approved.gp / b.approved.sales) * 100).toFixed(1)}% GP` : ''} color="#16a34a" onClick={() => drillBranch(b.branch, '/transactions/approvals')} />
                <KPICard label="Pending Sales" value={mB(b.branch, b.pending.sales)} delta={`${b.pending.count} to approve`} color="#d97706" onClick={() => drillBranch(b.branch, '/transactions/approvals')} />
                <KPICard label="Pending GP" value={mB(b.branch, b.pending.gp)} delta="not yet posted" color="#d97706" onClick={() => drillBranch(b.branch, '/transactions/approvals')} />
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

      {/* ── Trend + Targets ── */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="Revenue Trend — 12 Months" subtitle={compare ? 'Current Year vs Last Year' : 'Current Year only'} color="#c2a04a" onPin={() => togglePin('rev')} pinned={pinned.rev} onDrill={() => navigate('/reports/pnl')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch from the selector (top-right) to view its 12-month revenue trend. A consolidated trend isn’t shown because branches report in different currencies (₹ / $).</div>
            : <RevenueTrendChart data={revenueTrend} compareLastYear={compare} onToggleCompare={setCompare} formatMoney={m0} />}
        </WidgetCard>
        <WidgetCard title={`FY ${CUR_FY.label} Targets vs Actual`} color="#c2a04a" onPin={() => togglePin('targets')} pinned={pinned.targets} onDrill={() => navigate('/dashboards/sales-target')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch (top-right) to view its targets vs actual. Group targets aren’t consolidated across currencies.</div>
            : liveTargets.length
              ? <FyTargetsPanel targets={liveTargets} formatMoney={m0} />
              : <div className="px-0.5 py-1 text-xs text-ink-muted">No targets set. Add them in <b>Finance ▸ Sales Targets</b>.</div>}
        </WidgetCard>
      </div>

      {/* ── Governance & Operations cockpit ── carried over from the (retired-for-owner) My
          Dashboard so the owner loses nothing: Key Alerts (governance signal), Profit Bridge,
          13-week Cash Forecast and the Consultant Leaderboard. The three money-shaped panels
          are single-branch only (Group can't merge ₹ + $); Key Alerts always shows. */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-2">
        <WidgetCard title="Key Alerts" subtitle="What needs attention" color="#dc2626" onPin={() => togglePin('alerts')} pinned={pinned.alerts} onDrill={() => navigate('/dashboard/alerts')}>
          {keyAlerts.length
            ? <KeyAlertsPanel alerts={keyAlerts} onAlertClick={(route) => route && navigate(route)} />
            : <div className="px-0.5 py-3 text-xs text-ink-muted">No alerts — nothing needs attention right now.</div>}
        </WidgetCard>
        <WidgetCard title="Profit Bridge" subtitle={`Revenue → Net Profit · ${rangeShort}`} color="#16a34a" onPin={() => togglePin('bridge')} pinned={pinned.bridge} onDrill={() => navigate('/dashboards/profitability')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch (top-right) to view its profit bridge. A consolidated bridge isn’t shown because branches report in different currencies (₹ / $).</div>
            : <PnlWaterfallPanel branch={branchArg} range={dates} formatMoney={m0} onViewFullReport={() => navigate('/dashboards/profitability')} />}
        </WidgetCard>
      </div>
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-2">
        <WidgetCard title="Cash Forecast — 13 Weeks" subtitle="Projected liquidity" color="#0ea5e9" onPin={() => togglePin('forecast')} pinned={pinned.forecast} onDrill={() => navigate('/dashboards/cash-forecast')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch (top-right) to view its 13-week cash forecast. Not consolidated across currencies (₹ / $).</div>
            : <CashForecastPanel branch={branchArg} range={dates} formatMoney={m0} onView={() => navigate('/dashboards/cash-forecast')} />}
        </WidgetCard>
        <WidgetCard title="Consultant Leaderboard" subtitle={isAll ? 'Pick a branch to view' : `Top earners · ${effScope}`} color="#185FA5" onPin={() => togglePin('leader')} pinned={pinned.leader} onDrill={() => navigate('/reports/gp')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch (top-right) to view its consultant leaderboard. Not consolidated across branches (different currencies).</div>
            : <ConsultantLeaderboard consultants={topConsultants} formatMoney={m0} onViewAll={() => navigate('/reports/gp')} />}
        </WidgetCard>
      </div>

      {/* ── Financial detail (GP-by-Module · Balance Sheet · AR/AP · Cash & Bank) ──
          Group/ALL ⇒ rendered PER BRANCH, each in its own currency (never a ₹+USD merge);
          single-branch ⇒ the merged figures once. */}
      {isAll ? (
        perBranchKpis.map((r) => {
          const f = branchFin(r.code);
          return (
            <div key={r.code} className="mb-1">
              <div className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-1" style={{ borderColor: '#185FA5' }}>
                <span className="text-sm font-extrabold text-ink">{r.code}</span>
                <span className="text-[11px] font-bold text-ink-muted">· {bc({ code: r.code }).cur} · financial detail</span>
              </div>
              <FinancialTables mods={f.mods} assets={f.assets} liabs={f.liabs} rec={f.rec} pay={f.pay} recRows={f.recRows} payRows={f.payRows} bankRows={f.bankRows} liquidFallback={r.liquid} dateTo={dates.to} fmt={(n) => mB(r.code, n)} nav={(route) => drillBranch(r.code, route)} />
            </div>
          );
        })
      ) : (
        <FinancialTables mods={mods} assets={assets} liabs={liabs} rec={age.receivables?.totals} pay={age.payables?.totals} recRows={age.receivables?.rows || []} payRows={age.payables?.rows || []} bankRows={bankRows} liquidFallback={liquid} dateTo={dates.to} fmt={m0} nav={navigate} />
      )}

      {/* ── Branch performance ── */}
      <div className="mb-3.5">
        <WidgetCard title="Branch Performance" subtitle={`Sales · GP · Net Profit · ${rangeShort}`} color="#185FA5" onPin={() => togglePin('heat')} pinned={pinned.heat} onDrill={() => navigate('/dashboards/branch')}>
          <Scroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th scope="col" style={th}>Branch</th><th scope="col" style={{ ...th, ...num }}>Sales</th><th scope="col" style={{ ...th, ...num }}>GP</th><th scope="col" style={{ ...th, ...num }}>GP %</th><th scope="col" style={{ ...th, ...num }}>Net</th></tr></thead>
              <tbody>
                {branchRows.map((r) => <tr key={r.code} onClick={() => drillBranch(r.code, '/dashboards/branch')} style={{ cursor: 'pointer' }} title={`Open ${r.code} performance`}><td style={{ ...td, fontWeight: 700 }}>{r.code}</td><td style={{ ...td, ...num }}>{mB(r.code, r.sales)}</td><td style={{ ...td, ...num, color: r.gp < 0 ? C.red : C.green }}>{mB(r.code, r.gp)}</td><td style={{ ...td, ...num }}>{r.sales ? ((r.gp / r.sales) * 100).toFixed(1) : '0.0'}%</td><td style={{ ...td, ...num, fontWeight: 700, color: r.net < 0 ? C.red : C.dark }}>{mB(r.code, r.net)}</td></tr>)}
              </tbody>
            </table>
          </Scroll>
        </WidgetCard>
      </div>

      {/* ── Top customers / suppliers ── */}
      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Top 10 Customers" color="#185FA5" onPin={() => togglePin('topcust')} pinned={pinned.topcust} onDrill={() => navigate('/reports/customer-ltv')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch (top-right) to view its top customers. A cross-branch ranking isn’t shown because revenue is in different currencies (₹ / $).</div>
            : <TopEntitiesTable rows={topCustomers} kind="customer" formatMoney={m0} />}
        </WidgetCard>
        <WidgetCard title="Top 10 Suppliers" color="#d97706" onPin={() => togglePin('topsup')} pinned={pinned.topsup} onDrill={() => navigate('/reports/yield-supplier')}>
          {isAll
            ? <div className="px-0.5 py-3 text-xs text-ink-muted">Per-branch — pick a branch (top-right) to view its top suppliers. A cross-branch ranking isn’t shown because spend is in different currencies (₹ / $).</div>
            : <TopEntitiesTable rows={topSuppliers} kind="supplier" valueKey="spend" countKey="vouchers" formatMoney={m0} />}
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
