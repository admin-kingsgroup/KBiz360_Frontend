import React, { useState } from 'react';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { PeriodBar, periodRange } from '../../../core/period';
import { useTrialBalance } from '../../../core/useAccounting';
import { isLiquidRow } from '../../../core/ledgerKind';
import { useBranchDashboard } from '../hooks/use-branch-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { formatCurrency } from '../utils/helpers';
import { BranchHeader } from '../components/shared/BranchHeader';
import { NeedsActionStrip } from '../components/shared/NeedsActionStrip';
import { YoyStrip } from '../components/shared/YoyStrip';
import { PnlWaterfallPanel } from '../components/shared/PnlWaterfallPanel';
import { CashForecastPanel } from '../components/shared/CashForecastPanel';
import { AgeingPanel } from '../components/shared/AgeingPanel';
import { BalanceHealthPanel } from '../components/shared/BalanceHealthPanel';
import { CapitalPanel } from '../components/shared/CapitalPanel';
import { TargetsPanel } from '../components/shared/TargetsPanel';
import { TopCustomersPanel } from '../components/shared/TopCustomersPanel';
import { KpiTile } from '../components/cards/KpiTile';
import { GpByModulePanel } from '../components/shared/GpByModulePanel';
import { ConsultantLeaderboard } from '../components/shared/ConsultantLeaderboard';
import { ActionItemsPanel } from '../components/shared/ActionItemsPanel';
import { UpcomingTravelPanel } from '../components/shared/UpcomingTravelPanel';
import { QuickStatsCard } from '../components/cards/QuickStatsCard';
import { QuickCreateBar } from '../components/shared/QuickCreateBar';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';

export function BranchDashboardPage({ branch, setRoute }) {
  const { data, isLoading, isError, error, refetch, branchCode, currencySymbol, isIndia } = useBranchDashboard(branch);
  const { navigate } = useDashboardActions(setRoute);
  // Period drives the financial bands (P&L / Balance Sheet / ageing / targets) added
  // below the operational KPIs. The bundled ops payload above stays MTD/YTD as-is.
  const [range, setRange] = useState(() => periodRange('all', { branch }));
  // Live cash/bank position AS OF the period end — Σ closing of cash & bank ledgers.
  // Pass ONLY `to` (no `from`): a point-in-time closing balance must carry the full
  // opening + ALL movement up to `to`; a `from` cutoff would drop pre-period activity
  // while still adding the full opening (wrong hybrid). This matches the Balance-Sheet /
  // getCashPosition convention so the figure ties out with the Owner/Director cash views.
  const trial = useTrialBalance(branch, { to: range.to }).data || {};
  const cash = (trial.rows || []).filter(isLiquidRow).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);

  // This is a SINGLE-BRANCH performance view (figures + currency are that branch's).
  // In Group/ALL scope it would merge ₹ and USD branches under one symbol, so instead
  // point the user at the branch selector (the consolidated view lives on the Owner /
  // Director dashboards, which render per branch). Declared AFTER all hooks above.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  if (isAll) {
    return (
      <PageLayout>
        <div className="mx-auto mt-10 max-w-[560px] rounded-brand border border-surface-border bg-surface px-5 py-8 text-center text-sm text-ink-muted">
          The <b className="text-ink">Branch Dashboard</b> is a single-branch view. Pick a branch from the selector (top-right) to see its performance — a consolidated all-branch view isn’t shown here because branches report in different currencies (₹ / $). For the group view, use the Owner or Director dashboard.
        </div>
      </PageLayout>
    );
  }

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Branch Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton title="Branch Dashboard" numKpis={4} />;
  }

  const { kpis, gpByModule, topConsultants, actionItems, upcomingTravel, billsYtd } = data;
  const pb = data.pendingBookings || { count: 0, sales: 0, purchase: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, purchase: 0, gp: 0 };
  const rb = data.rejectedBookings || { count: 0, sales: 0, purchase: 0, gp: 0 };
  const db = data.deletedBookings || { count: 0, sales: 0, purchase: 0, gp: 0 };
  const formatMoney = (n) => formatCurrency(currencySymbol, n);

  return (
    <PageLayout>
      <BranchHeader
        branch={branch}
        branchCode={branchCode}
        isIndia={isIndia}
        bookingsCount={kpis.bookings}
        onNavigate={navigate}
      />

      {/* Period selector — scopes the financial bands (P&L / cash / balance / targets) */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <PeriodBar branch={branch} defaultPreset="all" compact onChange={setRange} />
        <span className="text-[11px] font-semibold text-ink-muted">Financials: {range.label}</span>
      </div>

      {/* ② Needs-Action strip — alerts + approvals awaiting this branch */}
      <NeedsActionStrip branch={branch} navigate={navigate} formatMoney={formatMoney} />

      {/* KPI Cards */}
      <ResponsiveGrid min="150px" gap="md" className="mb-4">
        <KpiTile
          label="MTD Revenue"
          value={formatMoney(kpis.revenue)}
          growth={kpis.revenueGrowth}
          icon="💰"
          color="#2563eb"
          onClick={() => navigate('/reports/sreg')}
        />
        <KpiTile
          label="Gross Profit"
          value={formatMoney(kpis.gp)}
          growth={kpis.gpGrowth}
          icon="📈"
          color="#16a34a"
          sub={kpis.gpPct + '%'}
          onClick={() => navigate('/reports/gp')}
        />
        <KpiTile
          label="Net Profit"
          value={formatMoney(kpis.netProfit)}
          sub="after expenses"
          icon="🏆"
          color={kpis.netProfit > 0 ? '#16a34a' : '#dc2626'}
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Unsettled Receivable"
          value={formatMoney(kpis.outstanding)}
          sub="pending to collect"
          icon="⏰"
          color="#b45309"
          onClick={() => navigate('/reports/rec')}
        />
        <KpiTile
          label="Unsettled Payable"
          value={formatMoney(kpis.payable)}
          sub="pending to pay"
          icon="📤"
          color="#dc2626"
          onClick={() => navigate('/reports/pay')}
        />
        <KpiTile
          label="Cash & Bank"
          value={formatMoney(cash)}
          sub={`as of ${range.to}`}
          icon="🏦"
          color={cash >= 0 ? '#0ea5e9' : '#dc2626'}
          onClick={() => navigate('/dashboards/cash')}
        />
        <KpiTile
          label="Bookings"
          value={String(kpis.bookings)}
          sub={`${formatMoney(kpis.revenue / Math.max(1, kpis.bookings))} avg`}
          icon="✈"
          color="#5b616e"
          onClick={() => navigate('/bookings/list')}
        />
        <KpiTile
          label="YTD Revenue"
          value={formatMoney(kpis.ytdRevenue)}
          sub={`GP ${formatMoney(kpis.ytdGp)}`}
          icon="📊"
          color="#5b616e"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual Sales"
          value={formatMoney(kpis.revenue)}
          sub="from the books (MTD)"
          icon="📒"
          color="#2563eb"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual Purchase"
          value={formatMoney(kpis.cost)}
          sub="COGS (MTD)"
          icon="📒"
          color="#b45309"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual GP"
          value={formatMoney(kpis.gp)}
          sub={kpis.gpPct + '% GP'}
          icon="📒"
          color="#16a34a"
          onClick={() => navigate('/reports/gp')}
        />
        <KpiTile
          label="Actual Expenses"
          value={formatMoney(kpis.expenses)}
          sub="indirect (MTD)"
          icon="📒"
          color="#dc2626"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual NP"
          value={formatMoney(kpis.netProfit)}
          sub="net profit (MTD)"
          icon="📒"
          color={kpis.netProfit > 0 ? '#16a34a' : '#dc2626'}
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Approved Sales"
          value={formatMoney(ab.sales)}
          sub={`${ab.count} approved · pipeline (all dates)`}
          icon="🧾"
          color="#2563eb"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Approved Purchase"
          value={formatMoney(ab.purchase)}
          sub="approved & posted"
          icon="📦"
          color="#b45309"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Approved GP"
          value={formatMoney(ab.gp)}
          sub={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP · pipeline` : 'pipeline (all dates)'}
          icon="📈"
          color="#16a34a"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Pending Sales"
          value={formatMoney(pb.sales)}
          sub={`${pb.count} pending · pipeline (all dates)`}
          icon="🧾"
          color="#2563eb"
          onClick={() => navigate('/bookings/pending')}
        />
        <KpiTile
          label="Pending Purchase"
          value={formatMoney(pb.purchase)}
          sub="awaiting approval"
          icon="📥"
          color="#b45309"
          onClick={() => navigate('/bookings/pending')}
        />
        <KpiTile
          label="Pending GP"
          value={formatMoney(pb.gp)}
          sub={pb.sales > 0 ? `${((pb.gp / pb.sales) * 100).toFixed(1)}% GP · pipeline` : 'pipeline (all dates)'}
          icon="⌛"
          color="#16a34a"
          onClick={() => navigate('/bookings/pending')}
        />
        <KpiTile
          label="Rejected Sales"
          value={formatMoney(rb.sales)}
          sub={`${rb.count} rejected booking${rb.count === 1 ? '' : 's'}`}
          icon="🚫"
          color="#dc2626"
          onClick={() => navigate('/bookings/rejected')}
        />
        <KpiTile
          label="Rejected Purchase"
          value={formatMoney(rb.purchase)}
          sub="declined"
          icon="🚫"
          color="#dc2626"
          onClick={() => navigate('/bookings/rejected')}
        />
        <KpiTile
          label="Rejected GP"
          value={formatMoney(rb.gp)}
          sub={rb.sales > 0 ? `${((rb.gp / rb.sales) * 100).toFixed(1)}% GP` : 'declined bookings'}
          icon="🚫"
          color="#dc2626"
          onClick={() => navigate('/bookings/rejected')}
        />
        <KpiTile
          label="Deleted Sales"
          value={formatMoney(db.sales)}
          sub={`${db.count} deleted booking${db.count === 1 ? '' : 's'}`}
          icon="🗑"
          color="#6b7280"
          onClick={() => navigate('/bookings/deleted')}
        />
        <KpiTile
          label="Deleted Purchase"
          value={formatMoney(db.purchase)}
          sub="reversed out"
          icon="🗑"
          color="#6b7280"
          onClick={() => navigate('/bookings/deleted')}
        />
        <KpiTile
          label="Deleted GP"
          value={formatMoney(db.gp)}
          sub={db.sales > 0 ? `${((db.gp / db.sales) * 100).toFixed(1)}% GP` : 'reversed bookings'}
          icon="🗑"
          color="#6b7280"
          onClick={() => navigate('/bookings/deleted')}
        />
      </ResponsiveGrid>

      {/* Year-on-year growth — Revenue · GP · Net Profit, CFY vs LFY */}
      <YoyStrip branch={branch} range={range} />

      <div className="mb-3 grid grid-cols-1 gap-3 desktop:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <PnlWaterfallPanel
            branch={branch}
            range={range}
            formatMoney={formatMoney}
            onViewFullReport={() => navigate('/reports/pnl')}
          />
          <GpByModulePanel
            modGp={gpByModule}
            totalGp={kpis.gp}
            formatMoney={formatMoney}
            onViewFullReport={() => navigate('/reports/gp')}
          />
          <ConsultantLeaderboard
            consultants={topConsultants}
            formatMoney={formatMoney}
            title="🏆 Top earners · MTD"
            onViewAll={() => navigate('/reports/gp')}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <ActionItemsPanel items={actionItems} onItemClick={navigate} />
          <UpcomingTravelPanel bookings={upcomingTravel} onViewAll={() => navigate('/bookings/list')} />
          <QuickStatsCard
            rows={[
              { label: 'YTD Revenue', value: formatMoney(kpis.ytdRevenue), color: '#fff' },
              { label: 'YTD Gross Profit', value: formatMoney(kpis.ytdGp), color: '#5ab84b' },
              {
                label: 'GP Margin',
                value: kpis.ytdRevenue > 0 ? +((kpis.ytdGp / kpis.ytdRevenue) * 100).toFixed(1) + '%' : '—',
                color: '#c2a04a',
              },
              { label: 'Active Bookings', value: String(billsYtd.length), color: '#5da0e0' },
              {
                label: 'Avg per Booking',
                value: billsYtd.length ? formatMoney(kpis.ytdRevenue / billsYtd.length) : '—',
                color: '#fff',
              },
            ]}
          />
        </div>
      </div>

      {/* ④ Cash & Working Capital — 13-week forecast + AR/AP ageing */}
      <div className="mb-3 grid grid-cols-1 gap-3 desktop:grid-cols-[2fr_1fr]">
        <CashForecastPanel
          branch={branch}
          range={range}
          formatMoney={formatMoney}
          onView={() => navigate('/dashboards/cash-forecast')}
        />
        <AgeingPanel
          branch={branch}
          formatMoney={formatMoney}
          onView={() => navigate('/dashboards/arap')}
        />
      </div>

      {/* ⑤ Financial Position — Balance Sheet health + Capital vs Investment + Tax */}
      <div className="mb-3 grid grid-cols-1 gap-3 desktop:grid-cols-2">
        <BalanceHealthPanel
          branch={branch}
          range={range}
          formatMoney={formatMoney}
          onView={() => navigate('/dashboards/balance-sheet')}
          onViewTax={() => navigate('/dashboards/tax')}
        />
        <CapitalPanel
          branch={branch}
          range={range}
          formatMoney={formatMoney}
          onView={() => navigate('/dashboards/capital')}
        />
      </div>

      {/* ⑥ Targets & Value — attainment vs target/budget + top customers (LTV/ABC) */}
      <div className="mb-3 grid grid-cols-1 gap-3 desktop:grid-cols-2">
        <TargetsPanel
          branch={branch}
          range={range}
          formatMoney={formatMoney}
          onView={() => navigate('/dashboards/sales-target')}
        />
        <TopCustomersPanel
          branch={branch}
          range={range}
          formatMoney={formatMoney}
          onView={() => navigate('/dashboards/customer-value')}
        />
      </div>

      <QuickCreateBar onNavigate={navigate} />
    </PageLayout>
  );
}
