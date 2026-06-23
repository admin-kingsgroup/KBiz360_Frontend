import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useSrAeDashboard } from '../hooks/use-sr-ae-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { TodayVouchersTable } from '../components/tables/TodayVouchersTable';
import { BankReconStatusPanel } from '../components/shared/BankReconStatusPanel';
import { CloseChecklist } from '../components/shared/CloseChecklist';
import { TopVendorsOverdueTable } from '../components/tables/TopVendorsOverdueTable';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';

export function SrAeDashboardPage({ currentUser, setRoute }) {
  const { data, todayTotal, todayValue, isLoading } = useSrAeDashboard();
  const { navigate } = useDashboardActions(setRoute);
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);

  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={4} columns={2} hasCharts={false} />;
  }

  const { todayVouchers, reconStatus, topSuppliers } = data;

  return (
    <PageLayout>
      <DashboardHeader
        title="Senior Accounts Executive Dashboard"
        subtitle="Throughput · approvals · close progress"
        user={currentUser}
        period={period}
        setPeriod={setPeriod}
        onExport={() => window.print()}
      />

      <ResponsiveGrid min="180px" gap="md" className="mb-3.5">
        <KPICard label="Pending My Approval" value="0" delta="" color="#d97706" onClick={() => navigate('/approvals')} />
        <KPICard label="Posted Today" value={todayTotal} delta={fmtINR(todayValue) + ' value'} color="#16a34a" />
        <KPICard label="Rejected to Branches" value="0" delta="" color="#dc2626" />
        <KPICard label="Bank Reco Issues" value="0" delta="" color="#c2a04a" onClick={() => navigate('/bank-reco')} />
      </ResponsiveGrid>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Today's Voucher Volume — By Branch">
          <TodayVouchersTable data={todayVouchers} />
        </WidgetCard>
        <WidgetCard title="Bank Reconciliation Status" onDrill={() => navigate('/bank-reco')}>
          <BankReconStatusPanel rows={reconStatus} />
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Monthly Close Checklist" subtitle={CUR_MONTH_LABEL}>
          <CloseChecklist onGo={navigate} />
        </WidgetCard>
        <WidgetCard title="Top 5 Vendors — Overdue Payables">
          <TopVendorsOverdueTable suppliers={topSuppliers.slice(0, 5)} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
