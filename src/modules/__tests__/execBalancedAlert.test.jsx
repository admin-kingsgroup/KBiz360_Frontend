// Regression: ExecutiveOverview's "Balance Sheet out of balance" alert.
// The backend always plugs the sheet with a "Difference in Opening Balances" liability
// row, so assetTotal−liabTotal is ~0 by construction — a raw recompute could NEVER fire
// the alert. The alert must instead read the size of that plug row (mirrors BalanceSheetDash).
jest.mock('../../core/useAccounting', () => ({
  useProfitAndLoss: jest.fn(() => ({ data: { netProfit: 25 } })),
  useModulePL: jest.fn(() => ({ data: { totals: { sales: 100, gp: 30, gpPct: 30 }, modules: [] } })),
  useBalanceSheet: jest.fn(() => ({ data: { assets: [], liabilities: [] } })),
  useAgeing: jest.fn(() => ({ data: { receivables: { totals: {} }, payables: { totals: {} } } })),
  useTaxSummary: jest.fn(() => ({ data: { netPayable: 30 } })),
  useTrialBalance: jest.fn(() => ({ data: { rows: [] } })),
  useVoucherApprovals: jest.fn(() => ({ data: { counts: { pending: { n: 0, amount: 0 } } } })),
  useYearOverYear: jest.fn(() => ({ data: { rows: [] } })),
  useInvoiceGP: jest.fn(() => ({ data: {} })),
  useModulePL_unused: undefined,
}));
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen } from '@testing-library/react';
import { useBalanceSheet } from '../../core/useAccounting';
import { ExecutiveOverview } from '../directorDashboards';

afterEach(() => jest.clearAllMocks());

describe('ExecutiveOverview — balance-sheet alert reads the plug row', () => {
  test('fires "out of balance" when a Difference in Opening Balances row exists', () => {
    useBalanceSheet.mockReturnValue({ data: {
      assets: [{ group: 'Cash', amount: 100 }],
      liabilities: [{ group: 'Capital', amount: 60 }, { group: 'Difference in Opening Balances', amount: 40 }],
    } });
    render(<ExecutiveOverview branch={'BOM'} />);
    expect(screen.getByText(/out of balance by/i)).toBeInTheDocument();
  });

  test('does NOT fire when there is no plug row (books tie)', () => {
    useBalanceSheet.mockReturnValue({ data: {
      assets: [{ group: 'Cash', amount: 100 }],
      liabilities: [{ group: 'Capital', amount: 100 }],
    } });
    render(<ExecutiveOverview branch={'BOM'} />);
    expect(screen.queryByText(/out of balance by/i)).toBeNull();
  });
});
