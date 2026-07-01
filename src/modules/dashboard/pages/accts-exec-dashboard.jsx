import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useAcctsExecDashboard } from '../hooks/use-accts-exec-dashboard';
import { useVoucherApprovals } from '../../../core/useAccounting';
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
  // "Errors to Fix" = vouchers rejected back to this branch's maker to correct & repost.
  const errorsToFix = useVoucherApprovals(ownBranch, 'pending').data?.counts?.rejected?.n ?? 0;
  const { navigate } = useDashboardActions(setRoute);
  // Money in the AE's OWN branch currency (data is always ownBranch, even if the top-right
  // selector is on 'ALL'/Group) — not bc(branch), which would force ₹ for a USD-branch AE.
  const cur = bc(ownBranch ? { code: ownBranch } : branch).cur;
  const money = (n) => compactAmt(n, { currency: cur });

  // An AE is single-branch. If we can't resolve their branch (no selection, no assigned
  // branch), point them at the selector rather than render an all-branch ₹-merged view.
  if (!ownBranch) {
    return (
      <PageLayout>
        <div className="mx-auto mt-10 max-w-[560px] rounded-brand border border-surface-border bg-surface px-5 py-8 text-center text-sm text-ink-muted">
          Pick a branch from the selector (top-right) to view the Accounts Executive Dashboard — it’s a single-branch maker view.
        </div>
      </PageLayout>
    );
  }

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Accounts Executive Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={4} columns={2} />;
  }

  const { recentActivity, arAgeing, apAgeing, weekStats } = data;
  const paymentsDue = (apAgeing || []).reduce((s, b) => s + (b.amount || 0), 0);
  const receiptsThisWeek = weekStats?.receipts ?? 0;

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
        <KPICard label="Today's Vouchers" value={String(branchData.total)} delta={money(branchData.value) + ' total'} color="#16a34a" />
        <KPICard label="Errors to Fix" value={String(errorsToFix)} delta={errorsToFix ? 'rejected — fix & repost' : 'none'} color={errorsToFix ? '#dc2626' : '#16a34a'} onClick={() => navigate('/transactions/voucher-approvals')} />
        <KPICard label="Receipts This Week" value={String(receiptsThisWeek)} delta={receiptsThisWeek ? money(weekStats.value) + ' received' : 'none'} color="#c2a04a" onClick={() => navigate('/finance/cash-book')} />
        <KPICard label="Open Payables" value={money(paymentsDue)} delta={paymentsDue ? 'open bills (gross)' : 'all clear'} color={paymentsDue ? '#d97706' : '#16a34a'} onClick={() => navigate('/reports/pay')} />
      </ResponsiveGrid>

      <div className="grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="Recent Activity Feed" subtitle="Recent actions on this branch" color="#185FA5">
          <RecentActivityFeed entries={recentActivity} formatMoney={money} />
        </WidgetCard>
        <WidgetCard title={`Customer Ageing — ${ownBranch}`} color="#dc2626" onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={money} condensed />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
