import React from 'react';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useBranchDashboard } from '../hooks/use-branch-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { formatCurrency } from '../utils/helpers';
import { BranchHeader } from '../components/shared/BranchHeader';
import { KpiTile } from '../components/cards/KpiTile';
import { GpByModulePanel } from '../components/shared/GpByModulePanel';
import { ConsultantLeaderboard } from '../components/shared/ConsultantLeaderboard';
import { ActionItemsPanel } from '../components/shared/ActionItemsPanel';
import { UpcomingTravelPanel } from '../components/shared/UpcomingTravelPanel';
import { QuickStatsCard } from '../components/cards/QuickStatsCard';
import { QuickCreateBar } from '../components/shared/QuickCreateBar';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';

export function BranchDashboardPage({ branch, setRoute }) {
  const { data, isLoading, branchCode, currencySymbol, isIndia } = useBranchDashboard(branch);
  const { navigate } = useDashboardActions(setRoute);

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
          label="Bookings"
          value={String(kpis.bookings)}
          sub={`${Math.round(kpis.revenue / Math.max(1, kpis.bookings)).toLocaleString()} avg`}
          icon="✈"
          color="#5b616e"
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
          sub={`${ab.count} approved booking${ab.count === 1 ? '' : 's'}`}
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
          sub={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP` : 'approved bookings'}
          icon="📈"
          color="#16a34a"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Pending Sales"
          value={formatMoney(pb.sales)}
          sub={`${pb.count} pending booking${pb.count === 1 ? '' : 's'}`}
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
          sub={pb.sales > 0 ? `${((pb.gp / pb.sales) * 100).toFixed(1)}% GP` : 'SO/PO/GP queue'}
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
      </ResponsiveGrid>

      <div className="mb-3 grid grid-cols-1 gap-3 desktop:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <GpByModulePanel
            modGp={gpByModule}
            totalGp={kpis.gp}
            formatMoney={formatMoney}
            onViewFullReport={() => navigate('/reports/gp')}
          />
          <ConsultantLeaderboard
            consultants={topConsultants}
            formatMoney={formatMoney}
            onViewAll={() => navigate('/reports/gp')}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <ActionItemsPanel items={actionItems} onItemClick={navigate} />
          <UpcomingTravelPanel bookings={upcomingTravel} />
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

      <QuickCreateBar onNavigate={navigate} />
    </PageLayout>
  );
}
