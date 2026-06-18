// Accountant workspace — pure helpers + a render smoke test of two key screens.
// api/crmApi use import.meta (no babel plugin under jest); useAccounting is mocked
// so the screens render against fixed data with no network.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

const AGE = {
  asOf: '2026-06-18',
  receivables: { rows: [
    { party: 'ACME', d0: 1000, d30: 500, d60: 0, d90: 200, total: 1700 },
    { party: 'Globe', d0: 0, d30: 0, d60: 0, d90: 0, total: 0 }, // not overdue / zero
  ], totals: { d0: 1000, d30: 500, d60: 0, d90: 200, total: 1700 } },
  payables: { rows: [{ party: 'TBO', d0: 800, d30: 0, d60: 0, d90: 0, total: 800 }], totals: { d0: 800, d30: 0, d60: 0, d90: 0, total: 800 } },
};
jest.mock('../core/useAccounting', () => ({
  branchCode: (b) => (b === 'ALL' || !b ? '' : (b.code || b)),
  useAgeing: () => ({ data: AGE }),
  useTaxSummary: () => ({ data: { netPayable: 1500 } }),
  useTrialBalance: () => ({ data: { rows: [
    { ledger: 'Cash', group: 'Cash-in-Hand', closingDebit: 5000, closingCredit: 0 },
    { ledger: 'HDFC Bank', group: 'Bank Account', closingDebit: 90000, closingCredit: 0 },
    { ledger: 'Bank Charges', group: 'Indirect Expenses', closingDebit: 700, closingCredit: 0 }, // must NOT count as bank
  ] } }),
  useVoucherApprovals: () => ({ data: [{ vno: 'V1' }] }),
  useBookingOrders: () => ({ data: [
    { bookingNo: 'BKG1', status: 'pending', module: 'SF', branch: 'BOM', validation: { hasErrors: true, errors: ['Ledger missing: X'] } },
    { bookingNo: 'BKG2', status: 'approved' },
  ] }),
  useSalesRegister: () => ({ data: [] }),
  usePurchaseRegister: () => ({ data: [] }),
  useConfigValue: () => ({ data: {} }),
  useSaveConfigValue: () => ({ mutate: jest.fn(), isPending: false }),
  useOutstanding: () => ({ data: { onAccountReceipts: [{ party: 'ACME', onAccount: 300 }] } }),
  useDayBook: () => ({ data: [{ category: 'receipt', totalDebit: 1200 }, { category: 'payment', totalDebit: 400 }] }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ymOf, groupBalance, NetAgeing, CollectionsFollowup, DashboardAccountant, MonthEndChecklist, SuspenseClearing } from '../modules/accountantWorkspace';

describe('accountant workspace — pure helpers', () => {
  test('ymOf handles ISO and DD/MM/YYYY', () => {
    expect(ymOf('2026-06-18')).toBe('2026-06');
    expect(ymOf('18/06/2026')).toBe('2026-06');
    expect(ymOf('')).toBe('');
  });
  test('groupBalance sums Dr − Cr for the matched group, by GROUP only (ignores look-alike ledgers)', () => {
    const rows = [
      { ledger: 'Cash', group: 'Cash-in-Hand', closingDebit: 5000, closingCredit: 0 },
      { ledger: 'HDFC', group: 'Bank Account', closingDebit: 90000, closingCredit: 1000 },
      { ledger: 'Bank Charges', group: 'Indirect Expenses', closingDebit: 700, closingCredit: 0 },
    ];
    expect(groupBalance(rows, /cash/i)).toBe(5000);
    expect(groupBalance(rows, /bank/i)).toBe(89000); // "Bank Charges" excluded (its group isn't a bank group)
  });
});

describe('accountant workspace — screens render', () => {
  test('NetAgeing shows receivable, payable and the net position', () => {
    render(<NetAgeing branch={{ code: 'BOM' }} />);
    expect(screen.getByText('RECEIVABLE (Debtors)')).toBeInTheDocument();
    expect(screen.getByText('PAYABLE (Creditors)')).toBeInTheDocument();
    expect(screen.getByText('NET POSITION')).toBeInTheDocument();
    // net = 1700 − 800 = 900 → ₹900
    expect(screen.getByText('₹900')).toBeInTheDocument();
  });
  test('Collections lists only overdue customers (>30d), not zero/current ones', () => {
    render(<CollectionsFollowup branch={{ code: 'BOM' }} />);
    expect(screen.getByText('ACME')).toBeInTheDocument();   // has d30+d90 overdue
    expect(screen.queryByText('Globe')).toBeNull();          // zero — excluded
  });

  test('Dashboard cockpit: cash/bank/GST, ageing buckets, net position, top lists, today, compliance', () => {
    render(<DashboardAccountant branch={{ code: 'BOM' }} setRoute={() => {}} />);
    // money
    expect(screen.getByText('₹5,000')).toBeInTheDocument();   // cash
    expect(screen.getByText('₹90,000')).toBeInTheDocument();  // bank (Bank Account only, not Bank Charges)
    expect(screen.getByText('₹1,200')).toBeInTheDocument();   // collected today (receipt)
    // ageing buckets + net position (1700 − 800 = 900)
    expect(screen.getByText('Debtors (Receivable)')).toBeInTheDocument();
    expect(screen.getByText('Creditors (Payable)')).toBeInTheDocument();
    expect(screen.getByText('Net Position')).toBeInTheDocument();
    expect(screen.getByText('₹900')).toBeInTheDocument();
    // worklist + top lists + compliance + GST
    expect(screen.getByText('Top overdue debtors — chase')).toBeInTheDocument();
    expect(screen.getByText('Month-End Progress')).toBeInTheDocument();
    expect(screen.getByText('TDS Payable')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();   // GST netPayable
  });

  test('Month-End checklist renders with auto-checks (trial balance / suspense)', () => {
    render(<MonthEndChecklist branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.getByText('Trial Balance balanced (Dr = Cr)')).toBeInTheDocument();
    expect(screen.getByText('Suspense cleared')).toBeInTheDocument();
    expect(screen.getByText('Bank reconciliation done')).toBeInTheDocument(); // manual item present
  });

  test('Suspense screen offers a Create Ledger action for a stuck item', () => {
    render(<SuspenseClearing branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.getByText('BKG1')).toBeInTheDocument();            // the stuck booking
    expect(screen.getByText('Create Ledger')).toBeInTheDocument();   // self-serve ledger creation
  });
});
