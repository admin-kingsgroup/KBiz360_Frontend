import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { useSrFmDashboard } from '../hooks/use-sr-fm-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { CashForecastChart } from '../components/shared/CashForecastChart';
import { BankBalancesPanel } from '../components/shared/BankBalancesPanel';
import { PeriodCloseTable } from '../components/tables/PeriodCloseTable';
import { GstrFilingPanel } from '../components/shared/GstrFilingPanel';
import { AgeingBuckets } from '../components/shared/AgeingBuckets';
import { VarianceFlagsPanel } from '../components/shared/VarianceFlagsPanel';
// GSTR_FILING_STATUS lives in the taxation module and is shared across both
// modules until a dedicated taxation feature service exists.
import { GSTR_FILING_STATUS } from '../../taxation';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';

export function SrFmDashboardPage({ currentUser, setRoute }) {
  const { data, isLoading } = useSrFmDashboard();
  const { navigate } = useDashboardActions(setRoute);
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);

  if (isLoading || !data) {
    return <DashboardSkeleton title="Senior Finance Manager Dashboard" numKpis={5} columns={3} hasCharts={true} />;
  }

  const { cashForecast, bankAccounts, periodClose, arAgeing, apAgeing, varianceFlags } = data;

  // Derive KPIs from the loaded data instead of hard-coded zeros, so figures
  // reflect reality (and populate automatically once the data sources fill in).
  const banksTotal = (bankAccounts || []).reduce((s, b) => s + (b.openingBal ?? b.balance ?? 0), 0);
  const arOutstanding = (arAgeing || []).reduce((s, b) => s + (b.amount || 0), 0);
  const periodClosed = (periodClose || []).filter((p) => p.status === 'Closed').length;
  const gstr3bFiled = (GSTR_FILING_STATUS || []).filter((g) => g.gstr3b === 'Filed').length;

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader
        title="Senior Finance Manager Dashboard"
        subtitle="Operational finance · all branches"
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
        <KPICard label="Pending My Approval" value={String(varianceFlags.length)} delta="" color="#f97316" onClick={() => navigate('/approvals')} />
        <KPICard
          label="Banks Balance Total"
          value={fmtINR(banksTotal)}
          delta=""
          color="#22c55e"
          onClick={() => navigate('/masters/bank-accounts')}
        />
        <KPICard label="Period Close" value={`${periodClosed}/${periodClose.length || 0}`} delta="" color="#d4a437" />
        <KPICard
          label="GSTR-3B Filed"
          value={`${gstr3bFiled}/${GSTR_FILING_STATUS.length}`}
          delta=""
          color="#A32D2D"
          onClick={() => navigate('/tax/gstr-3b')}
        />
        <KPICard
          label="Total AR Outstanding"
          value={fmtINR(arOutstanding)}
          delta=""
          color="#5a6691"
          onClick={() => navigate('/reports/rec')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard
          title="13-Week Cash Forecast"
          subtitle="Projected inflows / outflows / closing balance"
          onDrill={() => navigate('/reports/cashflow-forecast')}
        >
          <CashForecastChart data={cashForecast} />
        </WidgetCard>

        <WidgetCard title="Bank Balances — Real Time" onDrill={() => navigate('/masters/bank-accounts')}>
          <BankBalancesPanel accounts={bankAccounts} />
        </WidgetCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard title="Period Close Progress" subtitle={`Branch-by-branch ${CUR_MONTH_LABEL} close status`}>
          <PeriodCloseTable rows={periodClose} />
        </WidgetCard>

        <WidgetCard title="GSTR Filing Status" onDrill={() => navigate('/tax/gstr-1')}>
          <GstrFilingPanel rows={GSTR_FILING_STATUS} />
        </WidgetCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <WidgetCard title="Receivables Ageing" onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={fmtINR} />
        </WidgetCard>

        <WidgetCard title="Payables Ageing" onDrill={() => navigate('/reports/pay')}>
          <AgeingBuckets buckets={apAgeing} kind="payable" formatMoney={fmtINR} />
        </WidgetCard>

        <WidgetCard
          title="Recent Variance Flags"
          subtitle={varianceFlags.length + ' items'}
          onDrill={() => navigate('/reports/variance')}
        >
          <VarianceFlagsPanel flags={varianceFlags} />
        </WidgetCard>
      </div>
    </div>
  );
}
