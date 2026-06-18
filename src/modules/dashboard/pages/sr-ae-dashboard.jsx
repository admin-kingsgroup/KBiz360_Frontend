import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { CUR_MONTH_LABEL } from '../../../core/dates';
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
    return <DashboardSkeleton title="Senior Accounts Executive Dashboard" numKpis={4} columns={2} hasCharts={false} />;
  }

  const { todayVouchers, reconStatus, topSuppliers } = data;

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader
        title="Senior Accounts Executive Dashboard"
        subtitle="Throughput · approvals · close progress"
        user={currentUser}
        period={period}
        setPeriod={setPeriod}
        onExport={() => window.print()}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <KPICard label="Pending My Approval" value="0" delta="" color="#f97316" onClick={() => navigate('/approvals')} />
        <KPICard label="Posted Today" value={todayTotal} delta={fmtINR(todayValue) + ' value'} color="#22c55e" />
        <KPICard label="Rejected to Branches" value="0" delta="" color="#A32D2D" />
        <KPICard
          label="Bank Reco Issues"
          value="0"
          delta=""
          color="#d4a437"
          onClick={() => navigate('/bank-reco')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard title="Today's Voucher Volume — By Branch">
          <TodayVouchersTable data={todayVouchers} />
        </WidgetCard>

        <WidgetCard title="Bank Reconciliation Status" onDrill={() => navigate('/bank-reco')}>
          <BankReconStatusPanel rows={reconStatus} />
        </WidgetCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <WidgetCard title="Monthly Close Checklist" subtitle={CUR_MONTH_LABEL}>
          <CloseChecklist onGo={navigate} />
        </WidgetCard>

        <WidgetCard title="Top 5 Vendors — Overdue Payables">
          <TopVendorsOverdueTable suppliers={topSuppliers.slice(0, 5)} />
        </WidgetCard>
      </div>
    </div>
  );
}
