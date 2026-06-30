import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useAcctsExecDashboard } from '../hooks/use-accts-exec-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { PostShortcutTiles } from '../components/shared/PostShortcutTiles';
import { RecentActivityFeed } from '../components/shared/RecentActivityFeed';
import { AgeingBuckets } from '../components/shared/AgeingBuckets';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';

export function AcctsExecDashboardPage({ currentUser, setRoute, branch }) {
  // Follow the active branch from the switcher; fall back to the user's own
  // branch (an AE is single-branch). No hardcoded 'BOM' default.
  const ownBranch = (branch && branch !== 'ALL' && branch.code) || currentUser?.branches?.[0] || null;
  const { data, branchData, isLoading, isError, error, refetch } = useAcctsExecDashboard(ownBranch);
  const { navigate } = useDashboardActions(setRoute);
  // Branch-aware money (USD branches no longer forced to ₹).
  const cur = bc(branch).cur;
  const money = (n) => compactAmt(n, { currency: cur });

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Accounts Executive Dashboard." />;
  }
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
        onExport={() => openPrintPreview({ selector: 'main', title: 'Accounts Executive Dashboard', recommend: 'portrait' })}
      />

      <PostShortcutTiles onNavigate={navigate} />

      <ResponsiveGrid min="170px" gap="md" className="mb-3.5">
        <KPICard label="Today's Vouchers" value={branchData.total} delta={money(branchData.value) + ' total'} color="#16a34a" />
        {/* Not computed by the dashboard hook yet — "—" rather than a misleading "0".
            The "not tracked yet" delta tells the user this isn't a real zero. */}
        <KPICard label="Errors to Fix" value="—" delta="not tracked yet" color="#dc2626" />
        <KPICard label="Receipts This Week" value="—" delta="not tracked yet" color="#c2a04a" />
        <KPICard label="Payments Due" value="—" delta="not tracked yet" color="#d97706" />
      </ResponsiveGrid>

      <div className="grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="Recent Activity Feed" subtitle="Last 5 actions on this branch" color="#185FA5">
          <RecentActivityFeed entries={recentActivity} formatMoney={money} />
        </WidgetCard>
        <WidgetCard title={`Customer Ageing — ${ownBranch}`} color="#dc2626" onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={money} scale={1 / 6} condensed />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
