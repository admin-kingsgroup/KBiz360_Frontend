// Accts-Exec page: Customer Ageing shows the FULL amount (no /6 scale); the 3 former
// "—" KPIs are live (Errors to Fix = rejected vouchers, Receipts This Week = 7-day count,
// Open Payables = AP outstanding); money is in the AE's OWN branch currency (not ₹ when the
// selector is on ALL); "Today's Vouchers" works via the shared transformer fix.
const mockNavigate = jest.fn();
jest.mock('../hooks/use-accts-exec-dashboard', () => ({ useAcctsExecDashboard: jest.fn() }));
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
jest.mock('../components/shared/PostShortcutTiles', () => ({ PostShortcutTiles: () => null }));
jest.mock('../components/shared/RecentActivityFeed', () => ({ RecentActivityFeed: () => null }));
// AgeingBuckets is NOT stubbed — we render the real component to prove the amount isn't /6.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAcctsExecDashboard } from '../hooks/use-accts-exec-dashboard';
import { useVoucherApprovals } from '../../../core/useAccounting';
import { AcctsExecDashboardPage } from '../pages/accts-exec-dashboard';

const DATA = {
  recentActivity: [],
  arAgeing: [{ bucket: '90+ days', amount: 600000, color: '#dc2626', count: 1 }],
  apAgeing: [{ bucket: '0–30', amount: 40000 }, { bucket: '90+', amount: 10000 }],   // paymentsDue = 50000
  weekStats: { receipts: 9, value: 70000 },
};

afterEach(() => jest.clearAllMocks());

describe('Accts-Exec Dashboard', () => {
  beforeEach(() => {
    useAcctsExecDashboard.mockReturnValue({ data: DATA, branchData: { receipt: 4, payment: 2, journal: 0, total: 6, value: 30000 }, isLoading: false, isError: false, refetch: jest.fn() });
    useVoucherApprovals.mockReturnValue({ data: { counts: { rejected: { n: 4 } } } });
  });

  test('the 3 former placeholder KPIs are live (no "not tracked yet"), in the branch currency', () => {
    render(<AcctsExecDashboardPage currentUser={{ branches: ['NBO'] }} setRoute={jest.fn()} branch={{ code: 'NBO' }} />);
    expect(screen.getByText("KPI|Today's Vouchers|6|$30000 total")).toBeInTheDocument();
    expect(screen.getByText('KPI|Errors to Fix|4|rejected — fix & repost')).toBeInTheDocument();
    expect(screen.getByText('KPI|Receipts This Week|9|$70000 received')).toBeInTheDocument();
    expect(screen.getByText('KPI|Open Payables|$50000|open bills (gross)')).toBeInTheDocument();
    expect(screen.queryByText(/not tracked yet/)).toBeNull();
  });

  test('Customer Ageing shows the FULL receivable (no 1/6 scale)', () => {
    render(<AcctsExecDashboardPage currentUser={{ branches: ['NBO'] }} setRoute={jest.fn()} branch={{ code: 'NBO' }} />);
    expect(screen.getByText('$600000')).toBeInTheDocument();   // full amount
    expect(screen.queryByText('$100000')).toBeNull();          // the old /6 value
  });

  test('Errors to Fix drills to the voucher-approvals queue', () => {
    render(<AcctsExecDashboardPage currentUser={{ branches: ['NBO'] }} setRoute={jest.fn()} branch={{ code: 'NBO' }} />);
    fireEvent.click(screen.getByText('KPI|Errors to Fix|4|rejected — fix & repost'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions/voucher-approvals');
  });

  test('uses the AE own-branch currency even when the selector is on ALL (data is ownBranch)', () => {
    // selector 'ALL' but the AE is assigned to NBO → money must be $ (ownBranch), not ₹.
    render(<AcctsExecDashboardPage currentUser={{ branches: ['NBO'] }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText('KPI|Open Payables|$50000|open bills (gross)')).toBeInTheDocument();
  });
});
