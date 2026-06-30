// Sr-FM page: "Pending My Approval" must read the live pending-voucher-approval count
// (useVoucherApprovals), NOT varianceFlags.length; and Group/ALL is gated to a "pick a
// branch" note (single-branch view — no ₹+USD merge).
const mockNavigate = jest.fn();
jest.mock('../hooks/use-sr-fm-dashboard', () => ({ useSrFmDashboard: jest.fn() }));
jest.mock('../../../core/useAccounting', () => ({ useVoucherApprovals: jest.fn() }));
jest.mock('../hooks/use-dashboard-actions', () => ({ useDashboardActions: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../core/format', () => ({ compactAmt: (n, opts) => `${(opts && opts.currency) || ''}${Math.round(Number(n) || 0)}` }));
jest.mock('../../../core/styleTokens', () => ({ bc: (arg) => { const code = typeof arg === 'string' ? arg : arg && arg.code; return { cur: ['NBO', 'DAR', 'FBM'].includes(code) ? '$' : '₹' }; } }));
jest.mock('../../../core/styles', () => ({
  KPICard: ({ label, value, delta, onClick }) => <button onClick={onClick}>{`KPI|${label}|${value}|${delta || ''}`}</button>,
  WidgetCard: ({ title, children }) => <div>{title}{children}</div>,
}));
jest.mock('../../../core/helpers', () => ({ DashboardHeader: ({ title }) => <h1>{title}</h1> }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../components/shared/CashForecastChart', () => ({ CashForecastChart: () => null }));
jest.mock('../components/shared/BankBalancesPanel', () => ({ BankBalancesPanel: () => null }));
jest.mock('../components/tables/PeriodCloseTable', () => ({ PeriodCloseTable: () => null }));
jest.mock('../components/shared/GstrFilingPanel', () => ({ GstrFilingPanel: () => null }));
jest.mock('../components/shared/AgeingBuckets', () => ({ AgeingBuckets: () => null }));
jest.mock('../components/shared/VarianceFlagsPanel', () => ({ VarianceFlagsPanel: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSrFmDashboard } from '../hooks/use-sr-fm-dashboard';
import { useVoucherApprovals } from '../../../core/useAccounting';
import { SrFmDashboardPage } from '../pages/sr-fm-dashboard';

const DATA = {
  cashForecast: [], bankAccounts: [], periodClose: [{ branch: 'BOM', status: 'Closed' }],
  arAgeing: [], apAgeing: [],
  varianceFlags: [{ account: 'A' }, { account: 'B' }, { account: 'C' }],   // 3 — must NOT be the approval count
  gstrFiling: [{ entity: 'BOM', net: 1000, due: '20 Jun' }],
};

afterEach(() => jest.clearAllMocks());

describe('Sr-FM Dashboard', () => {
  test('"Pending My Approval" reads the live approvals count (7), not varianceFlags.length (3)', () => {
    useSrFmDashboard.mockReturnValue({ data: DATA, isLoading: false, isError: false, refetch: jest.fn() });
    useVoucherApprovals.mockReturnValue({ data: { counts: { pending: { n: 7 } } } });
    render(<SrFmDashboardPage currentUser={{ name: 'FM' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('KPI|Pending My Approval|7|vouchers to review')).toBeInTheDocument();
    expect(screen.queryByText('KPI|Pending My Approval|3|')).toBeNull();
    fireEvent.click(screen.getByText('KPI|Pending My Approval|7|vouchers to review'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions/voucher-approvals');
  });

  test('GST Payable KPI drills to the real GSTR-3B screen (not the dead /tax/gstr-3b route)', () => {
    useSrFmDashboard.mockReturnValue({ data: DATA, isLoading: false, isError: false, refetch: jest.fn() });
    useVoucherApprovals.mockReturnValue({ data: { counts: { pending: { n: 0 } } } });
    render(<SrFmDashboardPage currentUser={{ name: 'FM' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    fireEvent.click(screen.getByText('KPI|GST Payable (Return)|₹1000|due 20 Jun'));
    expect(mockNavigate).toHaveBeenCalledWith('/tax/gstr3b');
    expect(mockNavigate).not.toHaveBeenCalledWith('/tax/gstr-3b');
  });

  test('Group/ALL scope shows a "pick a branch" note (no merged cross-currency figures)', () => {
    useSrFmDashboard.mockReturnValue({ data: DATA, isLoading: false, isError: false, refetch: jest.fn() });
    useVoucherApprovals.mockReturnValue({ data: { counts: { pending: { n: 0 } } } });
    render(<SrFmDashboardPage currentUser={{ name: 'FM' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText(/single-branch view/)).toBeInTheDocument();
    expect(screen.queryByText(/Pending My Approval/)).toBeNull();
  });
});
