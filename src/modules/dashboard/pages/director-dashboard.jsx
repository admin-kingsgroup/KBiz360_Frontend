import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { RevenueTrendChart } from '../components/shared/RevenueTrendChart';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { BranchPlHeatmap } from '../components/shared/BranchPlHeatmap';
import { KeyAlertsPanel } from '../components/shared/KeyAlertsPanel';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';

export function DirectorDashboardPage({ currentUser, setRoute }) {
  const { data, totalCashInr, isLoading } = useDirectorDashboard();
  const { navigate } = useDashboardActions(setRoute);
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);
  const compare = useDashboardStore((s) => s.compareLastYear);
  const setCompare = useDashboardStore((s) => s.setCompareLastYear);
  const pinned = useDashboardStore((s) => s.pinnedWidgets);
  const togglePin = useDashboardStore((s) => s.togglePinnedWidget);

  if (isLoading || !data) {
    return <div style={{ padding: '24px', color: '#5a6691', fontSize: 12 }}>Loading director dashboard…</div>;
  }

  const { revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers } = data;
  const topCust = topCustomers[0] || { share: 0, name: '—' };
  const highValueApprovals = 0;

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader
        title="Director Dashboard"
        subtitle="Strategic overview · all branches consolidated"
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
        <KPICard
          label="Cash Position (INR equiv)"
          value={fmtINR(totalCashInr)}
          delta=""
          color="#22c55e"
          onClick={() => navigate('/reports/cashbook')}
        />
        <KPICard label="MTD Revenue" value={fmtINR(0)} delta="" color="#d4a437" onClick={() => navigate('/reports/pnl')} />
        <KPICard label="MTD GP" value={fmtINR(0)} delta="" color="#22c55e" onClick={() => navigate('/reports/gp')} />
        <KPICard
          label="Concentration Risk"
          value={topCust.share + '%'}
          delta={topCust.name}
          color="#A32D2D"
          onClick={() => navigate('/reports/concentration')}
        />
        <KPICard
          label="Approvals > ₹25L"
          value={highValueApprovals}
          delta="awaiting Director"
          color="#f97316"
          onClick={() => navigate('/approvals')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard
          title="Revenue Trend — 12 Months"
          subtitle={compare ? 'Current Year vs Last Year overlay' : 'Current Year only'}
          onPin={() => togglePin('rev')}
          pinned={pinned.rev}
          onDrill={() => navigate('/reports/pnl')}
        >
          <RevenueTrendChart data={revenueTrend} compareLastYear={compare} onToggleCompare={setCompare} />
        </WidgetCard>

        <WidgetCard
          title="FY 2025-26 Targets vs Actual"
          onPin={() => togglePin('targets')}
          pinned={pinned.targets}
        >
          <FyTargetsPanel targets={fyTargets} />
        </WidgetCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <WidgetCard
          title="Branch P&L Heatmap"
          subtitle="GP % by branch × month — darker = higher margin"
          onPin={() => togglePin('heat')}
          pinned={pinned.heat}
          onDrill={() => navigate('/reports/branch')}
        >
          <BranchPlHeatmap rows={branchHeatmap} />
        </WidgetCard>

        <WidgetCard
          title="Key Alerts"
          subtitle={keyAlerts.length + ' active'}
          onPin={() => togglePin('alerts')}
          pinned={pinned.alerts}
        >
          <KeyAlertsPanel alerts={keyAlerts} onAlertClick={navigate} />
        </WidgetCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <WidgetCard
          title="Top 10 Customers — YTD"
          onPin={() => togglePin('topcust')}
          pinned={pinned.topcust}
          onDrill={() => navigate('/masters/customers')}
        >
          <TopEntitiesTable rows={topCustomers} kind="customer" />
        </WidgetCard>

        <WidgetCard
          title="Top 10 Suppliers — YTD"
          onPin={() => togglePin('topsup')}
          pinned={pinned.topsup}
          onDrill={() => navigate('/masters/suppliers')}
        >
          <TopEntitiesTable rows={topSuppliers} kind="supplier" valueKey="spend" countKey="vouchers" />
        </WidgetCard>
      </div>
    </div>
  );
}
