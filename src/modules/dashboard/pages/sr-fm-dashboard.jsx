import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useSrFmDashboard } from '../hooks/use-sr-fm-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { CashForecastChart } from '../components/shared/CashForecastChart';
import { BankBalancesPanel } from '../components/shared/BankBalancesPanel';
import { PeriodCloseTable } from '../components/tables/PeriodCloseTable';
import { GstrFilingPanel } from '../components/shared/GstrFilingPanel';
import { AgeingBuckets } from '../components/shared/AgeingBuckets';
import { VarianceFlagsPanel } from '../components/shared/VarianceFlagsPanel';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { openPrintPreview } from '../../../core/PrintPreview';

export function SrFmDashboardPage({ currentUser, setRoute, branch }) {
  const branchCode = branch === 'ALL' ? null : branch?.code;
  const { data, isLoading } = useSrFmDashboard(branchCode);
  const { navigate } = useDashboardActions(setRoute);
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);

  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={5} columns={3} hasCharts={true} />;
  }

  const { cashForecast, bankAccounts, periodClose, arAgeing, apAgeing, varianceFlags, gstrFiling = [] } = data;

  // Derive KPIs from the loaded data instead of hard-coded zeros, so figures
  // reflect reality (and populate automatically once the data sources fill in).
  const banksTotal = (bankAccounts || []).reduce((s, b) => s + (b.openingBal ?? b.balance ?? 0), 0);
  const arOutstanding = (arAgeing || []).reduce((s, b) => s + (b.amount || 0), 0);
  const periodClosed = (periodClose || []).filter((p) => p.status === 'Closed').length;
  // Live GST return for the just-closed month: total net payable across entities (the
  // system tracks the liability, not the act of filing — so this is "due", never "filed").
  const gstrDue = gstrFiling.reduce((s, g) => s + (g.net || 0), 0);

  return (
    <PageLayout>
      <DashboardHeader
        title="Senior Finance Manager Dashboard"
        subtitle="Operational finance · all branches"
        user={currentUser}
        period={period}
        setPeriod={setPeriod}
        onExport={() => openPrintPreview({ selector: 'main', title: 'Senior Finance Manager Dashboard', recommend: 'portrait' })}
      />

      <ResponsiveGrid min="170px" gap="md" className="mb-3.5">
        <KPICard label="Pending My Approval" value={String(varianceFlags.length)} delta="" color="#d97706" onClick={() => navigate('/approvals')} />
        <KPICard label="Banks Balance Total" value={fmtINR(banksTotal)} delta="" color="#16a34a" onClick={() => navigate('/masters/bank-accounts')} />
        <KPICard label="Period Close" value={`${periodClosed}/${periodClose.length || 0}`} delta="" color="#c2a04a" />
        <KPICard label="GST Payable (Return)" value={fmtINR(gstrDue)} delta={gstrFiling[0] ? `due ${gstrFiling[0].due}` : 'no return due'} color="#dc2626" onClick={() => navigate('/tax/gstr-3b')} />
        <KPICard label="Total AR Outstanding" value={fmtINR(arOutstanding)} delta="" color="#5b616e" onClick={() => navigate('/reports/rec')} />
      </ResponsiveGrid>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="13-Week Cash Forecast" subtitle="Projected inflows / outflows / closing balance" onDrill={() => navigate('/reports/cashflow-forecast')}>
          <CashForecastChart data={cashForecast} />
        </WidgetCard>
        <WidgetCard title="Bank Balances — Real Time" onDrill={() => navigate('/masters/bank-accounts')}>
          <BankBalancesPanel accounts={bankAccounts} />
        </WidgetCard>
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Period Close Progress" subtitle={`Branch-by-branch ${CUR_MONTH_LABEL} close status`}>
          <PeriodCloseTable rows={periodClose} />
        </WidgetCard>
        <WidgetCard title="GSTR Filing Status" subtitle="Return for the just-closed month — net liability & due date" onDrill={() => navigate('/tax/gstr-1')}>
          <GstrFilingPanel rows={gstrFiling} />
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2 desktop:grid-cols-3">
        <WidgetCard title="Receivables Ageing" onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={fmtINR} />
        </WidgetCard>
        <WidgetCard title="Payables Ageing" onDrill={() => navigate('/reports/pay')}>
          <AgeingBuckets buckets={apAgeing} kind="payable" formatMoney={fmtINR} />
        </WidgetCard>
        <WidgetCard title="Recent Variance Flags" subtitle={varianceFlags.length + ' items'} onDrill={() => navigate('/reports/variance')}>
          <VarianceFlagsPanel flags={varianceFlags} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
