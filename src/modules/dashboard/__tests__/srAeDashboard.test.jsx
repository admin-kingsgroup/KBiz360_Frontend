// Sr-AE page: the four KPIs are now LIVE (no "—" placeholders) — Posted Today (count+value
// from the fixed transformer), Pending My Approval + Rejected to Branches (from
// useVoucherApprovals counts), Bank Reco Issues (Σ reconStatus unmatched); and Group/ALL is
// gated to a "pick a branch" note.
const mockNavigate = jest.fn();
jest.mock('../hooks/use-sr-ae-dashboard', () => ({ useSrAeDashboard: jest.fn() }));
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
jest.mock('../components/tables/TodayVouchersTable', () => ({ TodayVouchersTable: () => null }));
jest.mock('../components/shared/BankReconStatusPanel', () => ({ BankReconStatusPanel: () => null }));
jest.mock('../components/shared/CloseChecklist', () => ({ CloseChecklist: ({ branch }) => <div>{`close-checklist:${(branch && branch.code) || branch || 'NONE'}`}</div> }));
jest.mock('../components/tables/TopVendorsOverdueTable', () => ({ TopVendorsOverdueTable: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSrAeDashboard } from '../hooks/use-sr-ae-dashboard';
import { useVoucherApprovals } from '../../../core/useAccounting';
import { SrAeDashboardPage } from '../pages/sr-ae-dashboard';

const DATA = {
  todayVouchers: { BOM: { receipt: 4, payment: 2, journal: 1, total: 7, value: 50000 } },
  reconStatus: [{ bank: 'HDFC', matched: 10, unmatched: 3 }, { bank: 'ICICI', matched: 5, unmatched: 1 }],
  topVendorsOverdue: [],
};

afterEach(() => jest.clearAllMocks());

describe('Sr-AE Dashboard', () => {
  beforeEach(() => {
    useSrAeDashboard.mockReturnValue({ data: DATA, todayTotal: 7, todayValue: 50000, isLoading: false, isError: false, refetch: jest.fn() });
    useVoucherApprovals.mockReturnValue({ data: { counts: { pending: { n: 5 }, rejected: { n: 2 } } } });
  });

  test('all four KPIs are live (no "—" placeholders)', () => {
    render(<SrAeDashboardPage currentUser={{ name: 'AE' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('KPI|Posted Today|7|₹50000 value')).toBeInTheDocument();
    expect(screen.getByText('KPI|Pending My Approval|5|vouchers to review')).toBeInTheDocument();
    expect(screen.getByText('KPI|Rejected to Branches|2|sent back')).toBeInTheDocument();
    expect(screen.getByText('KPI|Bank Reco Issues|4|unmatched lines')).toBeInTheDocument();   // 3 + 1
    expect(screen.queryByText(/not tracked yet/)).toBeNull();
  });

  test('Pending My Approval drills to the unified voucher-approvals queue', () => {
    render(<SrAeDashboardPage currentUser={{ name: 'AE' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    fireEvent.click(screen.getByText('KPI|Pending My Approval|5|vouchers to review'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions/voucher-approvals');
  });

  test('Close Checklist gets the selected branch (so its alerts blocker-gate is branch-scoped, not all-branch)', () => {
    render(<SrAeDashboardPage currentUser={{ name: 'AE' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('close-checklist:BOM')).toBeInTheDocument();
  });

  test('Group/ALL scope shows a "pick a branch" note (no merged cross-currency figures)', () => {
    render(<SrAeDashboardPage currentUser={{ name: 'AE' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText(/single-branch view/)).toBeInTheDocument();
    expect(screen.queryByText(/Posted Today/)).toBeNull();
  });
});
