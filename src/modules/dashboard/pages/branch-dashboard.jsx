import React from 'react';
import { useMobile } from '../../../core/hooks';
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
  const mob = useMobile();
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
    <div style={{ padding: '12px 10px', maxWidth: 1400, margin: '0 auto' }}>
      <BranchHeader
        branch={branch}
        branchCode={branchCode}
        isIndia={isIndia}
        bookingsCount={kpis.bookings}
        onNavigate={navigate}
      />

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiTile
          label="MTD Revenue"
          value={formatMoney(kpis.revenue)}
          growth={kpis.revenueGrowth}
          icon="💰"
          color="#185FA5"
          onClick={() => navigate('/reports/sreg')}
        />
        <KpiTile
          label="Gross Profit"
          value={formatMoney(kpis.gp)}
          growth={kpis.gpGrowth}
          icon="📈"
          color="#27500A"
          sub={kpis.gpPct + '%'}
          onClick={() => navigate('/reports/gp')}
        />
        <KpiTile
          label="Net Profit"
          value={formatMoney(kpis.netProfit)}
          sub="after expenses"
          icon="🏆"
          color={kpis.netProfit > 0 ? '#1D9E75' : '#A32D2D'}
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Unsettled Receivable"
          value={formatMoney(kpis.outstanding)}
          sub="pending to collect"
          icon="⏰"
          color="#854F0B"
          onClick={() => navigate('/reports/rec')}
        />
        <KpiTile
          label="Unsettled Payable"
          value={formatMoney(kpis.payable)}
          sub="pending to pay"
          icon="📤"
          color="#A32D2D"
          onClick={() => navigate('/reports/pay')}
        />
        <KpiTile
          label="Bookings"
          value={String(kpis.bookings)}
          sub={`${(kpis.revenue / Math.max(1, kpis.bookings) | 0).toLocaleString()} avg`}
          icon="✈"
          color="#384677"
        />
        <KpiTile
          label="YTD Revenue"
          value={formatMoney(kpis.ytdRevenue)}
          sub={`GP ${formatMoney(kpis.ytdGp)}`}
          icon="📊"
          color="#5a6691"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual Sales"
          value={formatMoney(kpis.revenue)}
          sub="from the books (MTD)"
          icon="📒"
          color="#185FA5"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual Purchase"
          value={formatMoney(kpis.cost)}
          sub="COGS (MTD)"
          icon="📒"
          color="#854F0B"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual GP"
          value={formatMoney(kpis.gp)}
          sub={kpis.gpPct + '% GP'}
          icon="📒"
          color="#27500A"
          onClick={() => navigate('/reports/gp')}
        />
        <KpiTile
          label="Actual Expenses"
          value={formatMoney(kpis.expenses)}
          sub="indirect (MTD)"
          icon="📒"
          color="#A32D2D"
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Actual NP"
          value={formatMoney(kpis.netProfit)}
          sub="net profit (MTD)"
          icon="📒"
          color={kpis.netProfit > 0 ? '#1D9E75' : '#A32D2D'}
          onClick={() => navigate('/reports/pnl')}
        />
        <KpiTile
          label="Approved Sales"
          value={formatMoney(ab.sales)}
          sub={`${ab.count} approved booking${ab.count === 1 ? '' : 's'}`}
          icon="🧾"
          color="#185FA5"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Approved Purchase"
          value={formatMoney(ab.purchase)}
          sub="approved & posted"
          icon="📦"
          color="#854F0B"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Approved GP"
          value={formatMoney(ab.gp)}
          sub={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP` : 'approved bookings'}
          icon="📈"
          color="#27500A"
          onClick={() => navigate('/bookings/approved')}
        />
        <KpiTile
          label="Pending Sales"
          value={formatMoney(pb.sales)}
          sub={`${pb.count} pending booking${pb.count === 1 ? '' : 's'}`}
          icon="🧾"
          color="#185FA5"
          onClick={() => navigate('/bookings/pending')}
        />
        <KpiTile
          label="Pending Purchase"
          value={formatMoney(pb.purchase)}
          sub="awaiting approval"
          icon="📥"
          color="#854F0B"
          onClick={() => navigate('/bookings/pending')}
        />
        <KpiTile
          label="Pending GP"
          value={formatMoney(pb.gp)}
          sub={pb.sales > 0 ? `${((pb.gp / pb.sales) * 100).toFixed(1)}% GP` : 'SO/PO/GP queue'}
          icon="⌛"
          color="#27500A"
          onClick={() => navigate('/bookings/pending')}
        />
        <KpiTile
          label="Rejected Sales"
          value={formatMoney(rb.sales)}
          sub={`${rb.count} rejected booking${rb.count === 1 ? '' : 's'}`}
          icon="🚫"
          color="#A32D2D"
          onClick={() => navigate('/bookings/rejected')}
        />
        <KpiTile
          label="Rejected Purchase"
          value={formatMoney(rb.purchase)}
          sub="declined"
          icon="🚫"
          color="#A32D2D"
          onClick={() => navigate('/bookings/rejected')}
        />
        <KpiTile
          label="Rejected GP"
          value={formatMoney(rb.gp)}
          sub={rb.sales > 0 ? `${((rb.gp / rb.sales) * 100).toFixed(1)}% GP` : 'declined bookings'}
          icon="🚫"
          color="#A32D2D"
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
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mob ? '1fr' : '2fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionItemsPanel items={actionItems} onItemClick={navigate} />
          <UpcomingTravelPanel bookings={upcomingTravel} />
          <QuickStatsCard
            rows={[
              { label: 'YTD Revenue', value: formatMoney(kpis.ytdRevenue), color: '#fff' },
              { label: 'YTD Gross Profit', value: formatMoney(kpis.ytdGp), color: '#5ab84b' },
              {
                label: 'GP Margin',
                value: kpis.ytdRevenue > 0 ? +((kpis.ytdGp / kpis.ytdRevenue) * 100).toFixed(1) + '%' : '—',
                color: '#d4a437',
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
    </div>
  );
}
