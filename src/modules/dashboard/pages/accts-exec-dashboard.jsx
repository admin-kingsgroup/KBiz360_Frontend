import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
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
    return <DashboardSkeleton title="Accounts Executive Dashboard" numKpis={4} columns={2} />;
  }

  const { recentActivity, arAgeing } = data;

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader
        title={`Accounts Executive Dashboard — ${ownBranch}`}
        subtitle="Branch-scoped maker view · post vouchers · cannot approve own"
        user={currentUser}
        period={period}
        setPeriod={setPeriod}
        onExport={() => window.print()}
      />

      <PostShortcutTiles onNavigate={navigate} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <KPICard label="Today's Vouchers" value={branchData.total} delta={fmtINR(branchData.value) + ' total'} color="#22c55e" />
        <KPICard label="Errors to Fix" value="0" delta="" color="#A32D2D" />
        <KPICard label="Receipts This Week" value="0" delta="" color="#d4a437" />
        <KPICard label="Payments Due" value="0" delta="" color="#f97316" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <WidgetCard title="Recent Activity Feed" subtitle="Last 5 actions on this branch">
          <RecentActivityFeed entries={recentActivity} />
        </WidgetCard>

        <WidgetCard title={`Customer Ageing — ${ownBranch}`} onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={fmtINR} scale={1 / 6} condensed />
        </WidgetCard>
      </div>
    </div>
  );
}
