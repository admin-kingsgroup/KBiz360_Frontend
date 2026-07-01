// Regression: the "Cash Position Summary" report (/reports/cash-position) must render
// LIVE cash/bank ledger balances from the trial balance — it previously read a static
// empty BANK_ACCOUNTS_DATA=[] array and always showed a blank report.
// styles.jsx transitively imports ./api (import.meta — unparseable in Jest/CJS), so mock it.
jest.mock('../api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../useAccounting', () => ({
  useTrialBalance: jest.fn(() => ({
    data: {
      rows: [
        { ledger: 'HDFC Bank', group: 'Bank Accounts', liquidity: 'bank', closingDebit: 500000, closingCredit: 0 },
        { ledger: 'Cash In Hand', group: 'Cash-in-Hand', liquidity: 'cash', closingDebit: 2000, closingCredit: 0 },
        { ledger: 'Sundry Debtors', group: 'Sundry Debtors', closingDebit: 100000, closingCredit: 0 }, // NOT liquid
      ],
    },
    isLoading: false,
  })),
  // Other hooks used elsewhere in styles.jsx — never called by RPT_CashPosition.
  useGpBills: jest.fn(() => ({ data: {} })),
  useProfitAndLoss: jest.fn(() => ({ data: {} })),
  useYieldByDestination: jest.fn(() => ({ data: {} })),
  useCustomerLtv: jest.fn(() => ({ data: {} })),
  useAbcAnalysis: jest.fn(() => ({ data: {} })),
  useYearOverYear: jest.fn(() => ({ data: {} })),
  useFxExposure: jest.fn(() => ({ data: {} })),
}));

import { render, screen } from '@testing-library/react';
import { useTrialBalance } from '../useAccounting';
import { RPT_CashPosition } from '../styles';

describe('RPT_CashPosition — live cash & bank position', () => {
  test('renders liquid ledgers from the trial balance, excludes non-liquid rows', () => {
    render(<RPT_CashPosition branch={{ code: 'BOM' }} />);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('Cash In Hand')).toBeInTheDocument();
    // A non-liquid ledger must NOT appear on the cash position report.
    expect(screen.queryByText('Sundry Debtors')).toBeNull();
    // Summary tiles reflect the live counts (1 bank + 1 cash), not an empty demo array.
    expect(screen.getByText('Bank Ledgers')).toBeInTheDocument();
    expect(screen.getByText('Cash Ledgers')).toBeInTheDocument();
    // The live bank balance is formatted (₹5,00,000), proving it's not the blank report.
    expect(screen.getAllByText(/5,00,000/).length).toBeGreaterThan(0);
  });

  test('is driven by an as-of (to) date so the position can be back-dated', () => {
    render(<RPT_CashPosition branch={{ code: 'BOM' }} />);
    // A cash POSITION reads the trial balance as-of a `to` date (no `from` — it is a
    // balance, not a period flow). Default preset 'all' → to:'' (= today).
    expect(useTrialBalance).toHaveBeenCalledWith({ code: 'BOM' }, expect.objectContaining({ to: expect.any(String) }));
    const call = useTrialBalance.mock.calls[0][1];
    expect(call.from).toBeUndefined();
  });
});
