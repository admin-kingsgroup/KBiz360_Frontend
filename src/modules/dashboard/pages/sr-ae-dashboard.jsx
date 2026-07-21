import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useSrAeDashboard } from '../hooks/use-sr-ae-dashboard';
import { useVoucherApprovals } from '../../../core/useAccounting';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { TodayVouchersTable } from '../components/tables/TodayVouchersTable';
import { BankReconStatusPanel } from '../components/shared/BankReconStatusPanel';
import { CloseChecklist } from '../components/shared/CloseChecklist';
import { TopVendorsOverdueTable } from '../components/tables/TopVendorsOverdueTable';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';

export function SrAeDashboardPage({ currentUser, setRoute, branch }) {
  const branchCode = branch === 'ALL' ? null : branch?.code;
  const { data, todayTotal, todayValue, isLoading, isError, error, refetch } = useSrAeDashboard(branchCode);
  // Live approval counts (approvalReport returns all four status buckets in one call).
  const approvals = useVoucherApprovals(branchCode, 'pending').data?.counts || {};
  const pendingApprovals = approvals.pending?.n ?? 0;
  const rejectedToBranches = approvals.rejected?.n ?? 0;
  const { navigate } = useDashboardActions(setRoute);
  const money = (n) => compactAmt(n, { currency: bc(branch).cur });

  // Single-branch maker/approver view: figures + currency are one branch's. In Group/ALL the
  // money figures (Posted-Today value, bank-recon, overdue vendors) would mix ₹ and USD under
  // one symbol, so point the user at the selector. Declared AFTER all hooks above.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  if (isAll) {
    return (
      <PageLayout>
        <div className="mx-auto mt-10 max-w-[560px] rounded-brand border border-surface-border bg-surface px-5 py-8 text-center text-sm text-ink-muted">
          The <b className="text-ink">Senior Accounts Executive Dashboard</b> is a single-branch view. Pick a branch from the selector (top-right) — a consolidated all-branch view isn’t shown here because branches report in different currencies (₹ / $).
        </div>
      </PageLayout>
    );
  }

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Senior Accounts Executive Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={4} columns={2} hasCharts={false} />;
  }

  const { todayVouchers = [], reconStatus, topVendorsOverdue = [] } = data;
  const recoIssues = (reconStatus || []).reduce((s, r) => s + (r.unmatched || 0), 0);

  return (
    <PageLayout>
      <DashboardHeader
        title="Senior Accounts Executive Dashboard"
        subtitle="Throughput · approvals · close progress"
        user={currentUser}
        onExport={() => openPrintPreview({ selector: 'main', title: 'Senior Accounts Executive Dashboard', recommend: 'portrait' })}
      />

      <ResponsiveGrid min="180px" gap="md" className="mb-3.5">
        <KPICard label="Pending My Approval" value={String(pendingApprovals)} delta={pendingApprovals ? 'vouchers to review' : 'all clear'} color={pendingApprovals ? '#d97706' : '#16a34a'} onClick={() => navigate('/transactions/voucher-approvals')} />
        <KPICard label="Posted Today" value={String(todayTotal)} delta={money(todayValue) + ' value'} color="#16a34a" />
        <KPICard label="Rejected to Branches" value={String(rejectedToBranches)} delta={rejectedToBranches ? 'sent back' : 'none'} color={rejectedToBranches ? '#dc2626' : '#16a34a'} onClick={() => navigate('/transactions/voucher-approvals')} />
        <KPICard label="Bank Reco Issues" value={String(recoIssues)} delta={recoIssues ? 'unmatched lines' : 'all clean'} color={recoIssues ? '#c2a04a' : '#16a34a'} onClick={() => navigate('/bank-reco')} />
      </ResponsiveGrid>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Today's Voucher Volume — By Branch" color="#185FA5">
          <TodayVouchersTable data={todayVouchers} formatMoney={money} />
        </WidgetCard>
        <WidgetCard title="Bank Reconciliation Status" color="#16a34a" onDrill={() => navigate('/bank-reco')}>
          <BankReconStatusPanel rows={reconStatus} />
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Monthly Close Checklist" subtitle={CUR_MONTH_LABEL} color="#185FA5">
          <CloseChecklist branch={branch} onGo={navigate} />
        </WidgetCard>
        <WidgetCard title="Top 5 Vendors — Overdue Payables" color="#dc2626">
          <TopVendorsOverdueTable suppliers={topVendorsOverdue.slice(0, 5)} formatMoney={money} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
