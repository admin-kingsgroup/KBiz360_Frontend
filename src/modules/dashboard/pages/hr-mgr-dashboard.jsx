import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { useHrMgrDashboard } from '../hooks/use-hr-mgr-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { useDashboardStore } from '../store/dashboard.store';
import { BirthdaysPanel } from '../components/shared/BirthdaysPanel';
import { AnniversariesPanel } from '../components/shared/AnniversariesPanel';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';

export function HrMgrDashboardPage({ currentUser, setRoute }) {
  const { data: stats, isLoading } = useHrMgrDashboard();
  const { navigate } = useDashboardActions(setRoute);
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);

  if (isLoading || !stats) {
    return <DashboardSkeleton title="HR Manager Dashboard" numKpis={5} columns={2} hasCharts={false} />;
  }

  const [payrollLabel, payrollDelta = ''] = (stats.payrollStatus || '').split(' — ');

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      <DashboardHeader
        title="HR Manager Dashboard"
        subtitle="People · attendance · payroll"
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
          label="Total Headcount"
          value={stats.totalHeadcount}
          delta={`+${stats.changeThisMonth} this month`}
          color="#22c55e"
          onClick={() => navigate('/hr/employees')}
        />
        <KPICard
          label="Attendance %"
          value={stats.attendancePct + '%'}
          delta={`${CUR_MONTH_LABEL} current`}
          color="#d4a437"
          onClick={() => navigate('/hr/attendance')}
        />
        <KPICard
          label="Pending Leave"
          value={stats.pendingLeave}
          delta="awaiting approval"
          color="#f97316"
          onClick={() => navigate('/hr/leave')}
        />
        <KPICard
          label="Payroll Status"
          value={payrollLabel}
          delta={payrollDelta}
          color="#22c55e"
          onClick={() => navigate('/hr/payroll')}
        />
        <KPICard
          label="Open Positions"
          value={stats.openPositions}
          delta="recruitment active"
          color="#5a6691"
          onClick={() => navigate('/hr/recruitment')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <WidgetCard title="🎂 Upcoming Birthdays" subtitle="Next 7 days">
          <BirthdaysPanel birthdays={stats.birthdays} />
        </WidgetCard>

        <WidgetCard title="🎉 Work Anniversaries" subtitle="Next 30 days">
          <AnniversariesPanel anniversaries={stats.anniversaries} />
        </WidgetCard>
      </div>
    </div>
  );
}
