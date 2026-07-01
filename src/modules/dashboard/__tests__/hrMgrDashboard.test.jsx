// HR-Mgr page: now honours the branch selector (passes branchCode to the hook), the
// birthday/anniversary window labels match the backend (14 days), the dead "Send wish" /
// "Acknowledge" buttons are gone, and Payroll Status shows the month (no dead split).
jest.mock('../hooks/use-hr-mgr-dashboard', () => ({ useHrMgrDashboard: jest.fn() }));
jest.mock('../hooks/use-dashboard-actions', () => ({ useDashboardActions: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../core/dates', () => ({ CUR_MONTH_LABEL: 'Jul 2026' }));
jest.mock('../../../core/styles', () => ({
  KPICard: ({ label, value, delta }) => <div>{`KPI|${label}|${value}|${delta || ''}`}</div>,
  WidgetCard: ({ title, subtitle, children }) => <div>{title} :: {subtitle}{children}</div>,
}));
jest.mock('../../../core/helpers', () => ({ DashboardHeader: ({ title }) => <h1>{title}</h1> }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
// Render the REAL BirthdaysPanel/AnniversariesPanel to prove the dead buttons are gone.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useHrMgrDashboard } from '../hooks/use-hr-mgr-dashboard';
import { HrMgrDashboardPage } from '../pages/hr-mgr-dashboard';

const STATS = {
  totalHeadcount: 10, changeThisMonth: 1, attendancePct: 95, punctualityPct: 88, pendingLeave: 2,
  payrollStatus: 'Paid', openPositions: 3,
  birthdays: [{ name: 'Asha', branch: 'BOM', date: '03 Jul' }],
  anniversaries: [{ name: 'Ravi', branch: 'BOM', years: 5, date: '05 Jul' }],
};

afterEach(() => jest.clearAllMocks());

describe('HR-Mgr Dashboard', () => {
  beforeEach(() => useHrMgrDashboard.mockReturnValue({ data: STATS, isLoading: false, isError: false, refetch: jest.fn() }));

  test('passes the selected branch to the hook (selector-scoped); ALL → null', () => {
    const { rerender } = render(<HrMgrDashboardPage currentUser={{ name: 'HR' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(useHrMgrDashboard).toHaveBeenCalledWith('BOM');
    rerender(<HrMgrDashboardPage currentUser={{ name: 'HR' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(useHrMgrDashboard).toHaveBeenLastCalledWith(null);
  });

  test('birthday/anniversary window labels say "Next 14 days" (match backend)', () => {
    render(<HrMgrDashboardPage currentUser={{ name: 'HR' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText(/🎂 Upcoming Birthdays :: Next 14 days/)).toBeInTheDocument();
    expect(screen.getByText(/🎉 Work Anniversaries :: Next 14 days/)).toBeInTheDocument();
  });

  test('Payroll Status shows the month as delta (no dead " — " split)', () => {
    render(<HrMgrDashboardPage currentUser={{ name: 'HR' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('KPI|Payroll Status|Paid|Jul 2026')).toBeInTheDocument();
  });

  test('Punctuality % KPI renders the live value (— when absent)', () => {
    render(<HrMgrDashboardPage currentUser={{ name: 'HR' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('KPI|Punctuality %|88%|on-time arrivals')).toBeInTheDocument();
  });

  test('the dead "Send wish" / "Acknowledge" buttons are removed', () => {
    render(<HrMgrDashboardPage currentUser={{ name: 'HR' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('Asha')).toBeInTheDocument();        // real panel rendered
    expect(screen.getByText('Ravi')).toBeInTheDocument();
    expect(screen.queryByText('Send wish')).toBeNull();
    expect(screen.queryByText('Acknowledge')).toBeNull();
  });
});
