import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { CUR_FY } from '../../../core/dates';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { DashboardControls } from '../components/shared/DashboardControls';
import { RevenueTrendChart } from '../components/shared/RevenueTrendChart';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { BranchPlHeatmap } from '../components/shared/BranchPlHeatmap';
import { KeyAlertsPanel } from '../components/shared/KeyAlertsPanel';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';

const RANGE_SHORT = { month: 'This Month', quarter: 'This Quarter', ytd: 'YTD', all: 'All Time' };

export function DirectorDashboardPage({ currentUser, setRoute }) {
  const { navigate } = useDashboardActions(setRoute);
  const range = useDashboardStore((s) => s.range);
  const setRange = useDashboardStore((s) => s.setRange);
  const scope = useDashboardStore((s) => s.scope);
  const setScope = useDashboardStore((s) => s.setScope);
  const compare = useDashboardStore((s) => s.compareLastYear);
  const setCompare = useDashboardStore((s) => s.setCompareLastYear);
  const pinned = useDashboardStore((s) => s.pinnedWidgets);
  const togglePin = useDashboardStore((s) => s.togglePinnedWidget);
  const { data, totalCashInr, isLoading } = useDirectorDashboard({ range, scope });
  // Prefer live cash (Bank + Cash-in-Hand from the balance sheet); fall back to
  // the seed bank-accounts total only if the live read is unavailable.

  // Controls stay mounted (above the loading gate) so the period/scope toggles
  // never disappear while the next query is in flight.
  const Controls = <DashboardControls range={range} setRange={setRange} scope={scope} setScope={setScope} />;

  if (isLoading || !data) {
    return (
      <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
        <DashboardHeader title="Director Dashboard" subtitle="Strategic overview" user={currentUser} onExport={() => window.print()} />
        {Controls}
        <div style={{ padding: '24px', color: '#5a6691', fontSize: 12 }}>Loading director dashboard…</div>
      </div>
    );
  }

  const { revenueTrend, fyTargets, branchHeatmap, keyAlerts, topCustomers, topSuppliers } = data;
  const fig = data.figures || { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0 };
  const pb = data.pendingBookings || { count: 0, sales: 0, purchase: 0, gp: 0 };
  const ab = data.approvedBookings || { count: 0, sales: 0, purchase: 0, gp: 0 };
  const rangeShort = RANGE_SHORT[range] || 'This Month';
  const topCust = topCustomers[0] || { share: 0, name: '—' };
  const highValueApprovals = 0;

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader
        title="Director Dashboard"
        subtitle="Strategic overview"
        user={currentUser}
        onExport={() => window.print()}
      />

      {Controls}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <KPICard
          label="Cash & Bank (live)"
          value={fmtINR(fig.cash || totalCashInr)}
          delta=""
          color="#22c55e"
          onClick={() => navigate('/reports/cashbook')}
        />
        <KPICard label={`Revenue · ${rangeShort}`} value={fmtINR(fig.revenue)} delta="" color="#d4a437" onClick={() => navigate('/reports/pnl')} />
        <KPICard label={`Gross Profit · ${rangeShort}`} value={fmtINR(fig.gp)} delta={fig.gpPct ? `${fig.gpPct}% GP` : ''} color="#22c55e" onClick={() => navigate('/reports/gp')} />
        <KPICard label={`Net Profit · ${rangeShort}`} value={fmtINR(fig.netProfit)} delta="" color={fig.netProfit >= 0 ? '#1D9E75' : '#A32D2D'} onClick={() => navigate('/reports/pnl')} />
        <KPICard label="Unsettled Receivable" value={fmtINR(fig.outstanding)} delta="pending to collect" color="#854F0B" onClick={() => navigate('/reports/rec')} />
        <KPICard label="Unsettled Payable" value={fmtINR(fig.payable)} delta="pending to pay" color="#A32D2D" onClick={() => navigate('/reports/pay')} />
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

      {/* SO/PO/GP — realized totals from approved/posted bookings. */}
      <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#5a6691' }}>
        SO/PO/GP {ab.count ? `· ${ab.count} approved` : ''}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <KPICard label="Sales" value={fmtINR(ab.sales)} delta={`${ab.count} booking${ab.count === 1 ? '' : 's'}`} color="#d4a437" onClick={() => navigate('/bookings/approved')} />
        <KPICard label="Purchase" value={fmtINR(ab.purchase)} delta="approved & posted" color="#854F0B" onClick={() => navigate('/bookings/approved')} />
        <KPICard label="GP" value={fmtINR(ab.gp)} delta={ab.sales > 0 ? `${((ab.gp / ab.sales) * 100).toFixed(1)}% GP` : ''} color="#22c55e" onClick={() => navigate('/bookings/approved')} />
      </div>

      {/* Pending SO/PO/GP pipeline — value sitting in the approval queue (not yet posted). */}
      <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#5a6691' }}>
        Pending SO/PO/GP {pb.count ? `· ${pb.count} awaiting approval` : ''}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <KPICard label="Pending Sales" value={fmtINR(pb.sales)} delta={`${pb.count} booking${pb.count === 1 ? '' : 's'}`} color="#d4a437" onClick={() => navigate('/bookings/pending')} />
        <KPICard label="Pending Purchase" value={fmtINR(pb.purchase)} delta="awaiting approval" color="#854F0B" onClick={() => navigate('/bookings/pending')} />
        <KPICard label="Pending GP" value={fmtINR(pb.gp)} delta={pb.sales > 0 ? `${((pb.gp / pb.sales) * 100).toFixed(1)}% GP` : ''} color="#22c55e" onClick={() => navigate('/bookings/pending')} />
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
          title={`FY ${CUR_FY.label} Targets vs Actual`}
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
