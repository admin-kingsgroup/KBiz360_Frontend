// Regression: the Director dashboards read the LIVE backend shapes correctly.
//
// Two real bugs this locks in:
//   1) Balance Sheet rows are keyed `group` (not `name`) — the dashboard used to
//      render `r.name`, blanking every asset/liability line label.
//   2) Expenses heads come from module-PL `indirect.groups[].ledgers[]` — the
//      dashboard used to read `g.name`/`g.items` off P&L `indirect.debit` (keyed
//      `group`, no ledger items), so every expense head rendered blank.
//
// We mock the useAccounting hooks so the components render against fixed payloads
// shaped exactly like the backend returns.
jest.mock('../../core/useAccounting', () => ({
  useProfitAndLoss: jest.fn(() => ({ data: {} })),
  useModulePL: jest.fn(() => ({ data: {} })),
  useBalanceSheet: jest.fn(() => ({ data: {} })),
  useAgeing: jest.fn(() => ({ data: {} })),
  useInvoiceGP: jest.fn(() => ({ data: {} })),
  useTaxSummary: jest.fn(() => ({ data: {} })),
  useTrialBalance: jest.fn(() => ({ data: {} })),
  useVoucherApprovals: jest.fn(() => ({ data: {} })),
  useYearOverYear: jest.fn(() => ({ data: {} })),
  useBudgetVsActual: jest.fn(() => ({ data: {} })),
  useTargetsVsActual: jest.fn(() => ({ data: {} })),
  useSalesTargets: jest.fn(() => ({ data: [] })),
  useSaveTargets: jest.fn(() => ({ mutate: jest.fn() })),
}));
// PeriodBar pulls in react-query + the API client; stub it to a no-op.
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
// core/api.js uses import.meta (Vite) which jest's CJS transform can't parse; the
// dashboards under test never call it (those code paths aren't rendered).
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen } from '@testing-library/react';
import { useModulePL, useBalanceSheet } from '../../core/useAccounting';
import { BalanceSheetDash, ExpensesDash } from '../directorDashboards';

afterEach(() => jest.clearAllMocks());

describe('BalanceSheetDash — rows keyed `group`', () => {
  test('renders asset & liability line labels (not blank), per branch in ALL view', () => {
    // ALL/Group view renders each branch from the balance sheet's `byBranch` slice, in its
    // own currency (never a ₹+$ merge). Same `group`-keyed row shape the backend returns.
    useBalanceSheet.mockReturnValue({ data: {
      byBranch: [{ branch: 'BOM',
        assets: [{ group: 'Sundry Debtors', nature: 'asset', amount: 500000 }],
        liabilities: [{ group: 'Capital Account', nature: 'liability', amount: 300000 }],
      }],
    } });
    render(<BalanceSheetDash branch={'ALL'} />);
    expect(screen.getByText('Sundry Debtors')).toBeInTheDocument();
    expect(screen.getByText('Capital Account')).toBeInTheDocument();
  });
});

describe('ExpensesDash — module-PL ledger-level heads', () => {
  test('renders ledger-level expense head names from indirect.groups[].ledgers[]', () => {
    useModulePL.mockReturnValue({ data: {
      byBranch: [{ branch: 'BOM', indirect: {
        expense: 75000,
        groups: [
          { name: 'Administrative Expenses', amount: 75000, ledgers: [
            { name: 'Office Rent', amount: 50000 },
            { name: 'Electricity', amount: 25000 },
          ] },
        ],
      } }],
    } });
    render(<ExpensesDash branch={'ALL'} />);
    // ledger heads, not the group name, drive the bars
    expect(screen.getAllByText('Office Rent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Electricity').length).toBeGreaterThan(0);
    // "Largest Head" KPI sub shows the top head
    expect(screen.getByText('Expense Heads')).toBeInTheDocument();
  });

  test('falls back to group level when a group carries no ledgers', () => {
    useModulePL.mockReturnValue({ data: {
      byBranch: [{ branch: 'BOM', indirect: { expense: 40000, groups: [{ name: 'Bank Charges', amount: 40000, ledgers: [] }] } }],
    } });
    render(<ExpensesDash branch={'ALL'} />);
    expect(screen.getAllByText('Bank Charges').length).toBeGreaterThan(0);
  });
});
