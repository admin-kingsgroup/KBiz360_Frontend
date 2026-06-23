import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useAcctsExecDashboard } from '../hooks/use-accts-exec-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { PostShortcutTiles } from '../components/shared/PostShortcutTiles';
import { RecentActivityFeed } from '../components/shared/RecentActivityFeed';
import { AgeingBuckets } from '../components/shared/AgeingBuckets';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';

export function AcctsExecDashboardPage({ currentUser, setRoute /*, branch */ }) {
  const ownBranch = currentUser?.branches?.[0] || 'BOM';
  const { data, branchData, isLoading } = useAcctsExecDashboard(ownBranch);
  const { navigate } = useDashboardActions(setRoute);
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);

  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={4} columns={2} />;
  }

  const { recentActivity, arAgeing } = data;

  return (
    <PageLayout>
      <DashboardHeader
        title={`Accounts Executive Dashboard — ${ownBranch}`}
        subtitle="Branch-scoped maker view · post vouchers · cannot approve own"
        user={currentUser}
        period={period}
        setPeriod={setPeriod}
        onExport={() => window.print()}
      />

      <PostShortcutTiles onNavigate={navigate} />

      <ResponsiveGrid min="170px" gap="md" className="mb-3.5">
        <KPICard label="Today's Vouchers" value={branchData.total} delta={fmtINR(branchData.value) + ' total'} color="#16a34a" />
        <KPICard label="Errors to Fix" value="0" delta="" color="#dc2626" />
        <KPICard label="Receipts This Week" value="0" delta="" color="#c2a04a" />
        <KPICard label="Payments Due" value="0" delta="" color="#d97706" />
      </ResponsiveGrid>

      <div className="grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="Recent Activity Feed" subtitle="Last 5 actions on this branch">
          <RecentActivityFeed entries={recentActivity} />
        </WidgetCard>
        <WidgetCard title={`Customer Ageing — ${ownBranch}`} onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={fmtINR} scale={1 / 6} condensed />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
