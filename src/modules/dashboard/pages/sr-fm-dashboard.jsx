import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useSrFmDashboard } from '../hooks/use-sr-fm-dashboard';
import { useVoucherApprovals } from '../../../core/useAccounting';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { CashForecastChart } from '../components/shared/CashForecastChart';
import { BankBalancesPanel } from '../components/shared/BankBalancesPanel';
import { PeriodCloseTable } from '../components/tables/PeriodCloseTable';
import { GstrFilingPanel } from '../components/shared/GstrFilingPanel';
import { AgeingBuckets } from '../components/shared/AgeingBuckets';
import { VarianceFlagsPanel } from '../components/shared/VarianceFlagsPanel';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';

export function SrFmDashboardPage({ currentUser, setRoute, branch }) {
  const branchCode = branch === 'ALL' ? null : branch?.code;
  const { data, isLoading, isError, error, refetch } = useSrFmDashboard(branchCode);
  // Real "pending my approval" count — vouchers awaiting approval (NOT budget-variance flags).
  const pendingApprovals = useVoucherApprovals(branchCode, 'pending').data?.counts?.pending?.n ?? 0;
  const { navigate } = useDashboardActions(setRoute);
  const money = (n) => compactAmt(n, { currency: bc(branch).cur });

  // Single-branch view: figures + currency are one branch's. In Group/ALL it would sum ₹
  // and USD branches under one symbol, so point the user at the selector (a currency-correct
  // consolidated finance view lives on the Owner dashboard). Declared AFTER all hooks above.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  if (isAll) {
    return (
      <PageLayout>
        <div className="mx-auto mt-10 max-w-[560px] rounded-brand border border-surface-border bg-surface px-5 py-8 text-center text-sm text-ink-muted">
          The <b className="text-ink">Senior Finance Manager Dashboard</b> is a single-branch view (bank balances, ageing, GST and variance are shown in that branch’s currency). Pick a branch from the selector (top-right) — a consolidated all-branch view isn’t shown here because branches report in different currencies (₹ / $).
        </div>
      </PageLayout>
    );
  }

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the Senior Finance Manager Dashboard." />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={5} columns={3} hasCharts={true} />;
  }

  const { cashForecast, bankAccounts, periodClose = [], arAgeing, apAgeing, varianceFlags = [], gstrFiling = [] } = data;

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
        subtitle={`Operational finance · ${branch?.code || ''}`}
        user={currentUser}
        onExport={() => openPrintPreview({ selector: 'main', title: 'Senior Finance Manager Dashboard', recommend: 'portrait' })}
      />

      <ResponsiveGrid min="170px" gap="md" className="mb-3.5">
        <KPICard label="Pending My Approval" value={String(pendingApprovals)} delta={pendingApprovals ? 'vouchers to review' : 'all clear'} color={pendingApprovals ? '#d97706' : '#16a34a'} onClick={() => navigate('/transactions/voucher-approvals')} />
        <KPICard label="Banks Balance Total" value={money(banksTotal)} delta="" color="#16a34a" onClick={() => navigate('/masters/bank-accounts')} />
        <KPICard label="Period Close" value={`${periodClosed}/${periodClose.length || 0}`} delta="" color="#c2a04a" />
        <KPICard label="GST Payable (Return)" value={money(gstrDue)} delta={gstrFiling[0] ? (gstrDue > 0 ? `due ${gstrFiling[0].due}` : 'refundable') : 'no return due'} color={gstrDue > 0 ? '#dc2626' : '#16a34a'} onClick={() => navigate('/tax/gstr3b')} />
        <KPICard label="Total AR Outstanding" value={money(arOutstanding)} delta="" color="#5b616e" onClick={() => navigate('/reports/rec')} />
      </ResponsiveGrid>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-[2fr_1fr]">
        <WidgetCard title="13-Week Cash Forecast" subtitle="Projected inflows / outflows / closing balance" color="#16a34a" onDrill={() => navigate('/reports/cashflow-forecast')}>
          <CashForecastChart data={cashForecast} formatMoney={money} />
        </WidgetCard>
        <WidgetCard title="Bank Balances — Real Time" color="#16a34a" onDrill={() => navigate('/masters/bank-accounts')}>
          <BankBalancesPanel accounts={bankAccounts} formatMoney={money} />
        </WidgetCard>
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="Period Close Progress" subtitle={`Branch-by-branch ${CUR_MONTH_LABEL} close status`} color="#185FA5">
          <PeriodCloseTable rows={periodClose} />
        </WidgetCard>
        <WidgetCard title="GSTR Filing Status" subtitle="Return for the just-closed month — net liability & due date" color="#d97706" onDrill={() => navigate('/tax/gstr1')}>
          <GstrFilingPanel rows={gstrFiling} formatMoney={money} />
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2 desktop:grid-cols-3">
        <WidgetCard title="Receivables Ageing" color="#dc2626" onDrill={() => navigate('/reports/rec')}>
          <AgeingBuckets buckets={arAgeing} kind="receivable" formatMoney={money} />
        </WidgetCard>
        <WidgetCard title="Payables Ageing" color="#dc2626" onDrill={() => navigate('/reports/pay')}>
          <AgeingBuckets buckets={apAgeing} kind="payable" formatMoney={money} />
        </WidgetCard>
        <WidgetCard title="Recent Variance Flags" subtitle={varianceFlags.length + ' items'} color="#d97706" onDrill={() => navigate('/reports/variance')}>
          <VarianceFlagsPanel flags={varianceFlags} formatMoney={money} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
