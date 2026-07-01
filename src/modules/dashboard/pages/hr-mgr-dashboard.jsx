import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { KPICard, WidgetCard } from '../../../core/styles';
import { CUR_MONTH_LABEL } from '../../../core/dates';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid } from '../../../shell/primitives';
import { useHrMgrDashboard } from '../hooks/use-hr-mgr-dashboard';
import { useDashboardActions } from '../hooks/use-dashboard-actions';
import { BirthdaysPanel } from '../components/shared/BirthdaysPanel';
import { AnniversariesPanel } from '../components/shared/AnniversariesPanel';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';

export function HrMgrDashboardPage({ currentUser, setRoute, branch }) {
  // Honour the branch selector (within the user's HR scope). Group/ALL → full scope.
  const branchCode = branch === 'ALL' ? null : branch?.code;
  const { data: stats, isLoading, isError, error, refetch } = useHrMgrDashboard(branchCode);
  const { navigate } = useDashboardActions(setRoute);

  if (isError && !stats) {
    return <DashboardError error={error} onRetry={refetch} title="Could not load the HR Manager Dashboard." />;
  }
  if (isLoading || !stats) {
    return <DashboardSkeleton numKpis={5} columns={2} hasCharts={false} />;
  }

  return (
    <PageLayout>
      <DashboardHeader
        title="HR Manager Dashboard"
        subtitle="People · attendance · payroll"
        user={currentUser}
        onExport={() => openPrintPreview({ selector: 'main', title: 'HR Manager Dashboard', recommend: 'portrait' })}
      />

      <ResponsiveGrid min="170px" gap="md" className="mb-3.5">
        <KPICard label="Total Headcount" value={stats.totalHeadcount} delta={`+${stats.changeThisMonth} this month`} color="#16a34a" onClick={() => navigate('/hr/employees')} />
        <KPICard label="Attendance %" value={stats.attendancePct == null ? '—' : stats.attendancePct + '%'} delta={`${CUR_MONTH_LABEL} current`} color="#c2a04a" onClick={() => navigate('/hr/attendance')} />
        <KPICard label="Pending Leave" value={stats.pendingLeave} delta="awaiting approval" color="#d97706" onClick={() => navigate('/hr/leave')} />
        <KPICard label="Payroll Status" value={stats.payrollStatus || 'Not run'} delta={CUR_MONTH_LABEL} color="#16a34a" onClick={() => navigate('/hr/payroll')} />
        <KPICard label="Open Positions" value={stats.openPositions} delta="recruitment active" color="#5b616e" onClick={() => navigate('/hr/recruitment')} />
      </ResponsiveGrid>

      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
        <WidgetCard title="🎂 Upcoming Birthdays" subtitle="Next 14 days" color="#db2777">
          <BirthdaysPanel birthdays={stats.birthdays} />
        </WidgetCard>
        <WidgetCard title="🎉 Work Anniversaries" subtitle="Next 14 days" color="#c2a04a">
          <AnniversariesPanel anniversaries={stats.anniversaries} />
        </WidgetCard>
      </div>
    </PageLayout>
  );
}
