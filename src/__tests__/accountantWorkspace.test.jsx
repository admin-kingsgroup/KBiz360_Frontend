// Accountant workspace — pure helpers + a render smoke test of two key screens.
// api/crmApi use import.meta (no babel plugin under jest); useAccounting is mocked
// so the screens render against fixed data with no network.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));
// Real period engine (pure) but stub the inception query (it would hit the network).
jest.mock('../core/period', () => ({ ...jest.requireActual('../core/period'), useInception: () => ({ data: { from: '2024-04-01' } }) }));
// PnlTrend uses useQueries — return an empty array so it renders nothing harmlessly.
jest.mock('@tanstack/react-query', () => ({ ...jest.requireActual('@tanstack/react-query'), useQueries: () => [] }));

const AGE = {
  asOf: '2026-06-18',
  receivables: { rows: [
    { party: 'ACME', d0: 1000, d30: 500, d60: 0, d90: 200, billed: 2500, settled: 800, total: 1700, onAccount: 0, net: 1700 },
    { party: 'Globe', d0: 0, d30: 0, d60: 0, d90: 0, billed: 0, settled: 0, total: 0, onAccount: 0, net: 0 }, // not overdue / zero
  ], totals: { d0: 1000, d30: 500, d60: 0, d90: 200, billed: 2500, settled: 800, total: 1700, onAccount: 0, net: 1700 } },
  payables: { rows: [{ party: 'TBO', d0: 800, d30: 0, d60: 0, d90: 0, billed: 1100, settled: 300, total: 800, onAccount: 0, net: 800 }], totals: { d0: 800, d30: 0, d60: 0, d90: 0, billed: 1100, settled: 300, total: 800, onAccount: 0, net: 800 } },
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
  // Real /api/vouchers/approvals shape: an object { counts, entries } — not a bare array.
  useVoucherApprovals: () => ({ data: { counts: { pending: { n: 1, amount: 0 } }, entries: [{ vno: 'V1' }] } }),
  useBookingOrders: () => ({ data: [
    { bookingNo: 'BKG1', status: 'pending', module: 'SF', branch: 'BOM', validation: { hasErrors: true, errors: ['Ledger missing: X'] } },
    { bookingNo: 'BKG2', status: 'approved' },
  ] }),
  useSalesRegister: () => ({ data: [] }),
  usePurchaseRegister: () => ({ data: [] }),
  useRegisterSummary: () => ({ data: { count: 0, total: 0, subtotal: 0 } }),
  useConfigValue: () => ({ data: {} }),
  useSaveConfigValue: () => ({ mutate: jest.fn(), isPending: false }),
  useOutstanding: () => ({ data: {
    salesBills: [{ party: 'ACME', billVno: 'SF/001', date: '2026-05-01', total: 1700, settled: 0, outstanding: 1700, ageDays: 40 }],
    purchaseBills: [{ party: 'TBO', billVno: 'PB/009', date: '2026-05-03', total: 800, settled: 0, outstanding: 800, ageDays: 30 }],
    onAccountReceipts: [{ party: 'ACME', vno: 'R1', onAccount: 300, ageDays: 5 }],
    onAccountPayments: [{ party: 'TBO', vno: 'P9', onAccount: 700, ageDays: 12 }],
    totals: { onAccountReceipts: 300, onAccountPayments: 700, salesOutstanding: 1700, purchaseOutstanding: 800 },
  } }),
  useDayBook: () => ({ data: [{ category: 'receipt', totalDebit: 1200 }, { category: 'payment', totalDebit: 400 }] }),
  useAlerts: () => ({ data: { alerts: [] } }),
  // New live panels: cash outlook (forecast) + branch P&L snapshot + RCM.
  useCashForecast: () => ({ data: [{ week: 'W1', inflow: 5000, outflow: 2000, closing: 8000 }] }),
  useModulePL: () => ({ data: { totals: { sales: 100000, cogs: 70000, gp: 30000, gpPct: 30 }, indirect: { expense: 5000 }, bridge: { netProfit: 25000 } } }),
  useRcmLiability: () => ({ data: { igst: 1800, taxable: 10000, count: 2 } }),
  // Period control + Performance budget vs actual.
  useInception: () => ({ data: { from: '2024-04-01' } }),
  useBudgetVsActual: () => ({ data: { rows: [] } }),
}));
// PDC tracker pulls its own engine.
jest.mock('../core/usePDC', () => ({
  usePDCSummary: () => ({ data: { counts: { pending: 2, deposited: 0, cleared: 0, bounced: 1, total: 3 }, amounts: { pending: 5000, deposited: 0, cleared: 0, bounced: 1000 }, dueToDeposit: 1 } }),
}));
// Master-data health: server-computed defect counts per master.
jest.mock('../core/useMasters', () => ({
  useMasterHealth: (resource) => ({ data: resource === 'suppliers'
    ? { total: 10, noGstin: 1, noPan: 0, noState: 2, foreign: 1 }
    : { total: 20, noTaxId: 3, noState: 1 } }),
}));
// Collections workspace reads its own board endpoint + mutation hooks.
jest.mock('../core/useCollections', () => ({
  useCollectionsBoard: () => ({ data: {
    asOf: '2026-06-20',
    totals: { overdue: 1700, customers: 1, promised: 0, escalated: 0 },
    rows: [{ party: 'ACME', d0: 1000, d30: 500, d60: 0, d90: 200, overdue: 700, total: 1700, net: 1700, onAccount: 0,
      followup: { party: 'ACME', branch: 'BOM', status: 'open', dunningLevel: 0, remindersSent: 0, contactLog: [], notes: '', promisedDate: '' } }],
  } }),
  useUpsertFollowup: () => ({ mutate: jest.fn() }),
  useAddContact: () => ({ mutate: jest.fn() }),
  useReminderRun: () => ({ mutate: jest.fn() }),
}));
// The redesigned dashboard also pulls the tax calendar and bank-reco summary.
jest.mock('../core/useReference', () => ({ useTaxCalendar: () => ({ data: [] }), useExpenseBudgets: () => ({ data: [] }) }));
jest.mock('../core/useBankReco', () => ({
  useBankLedgers: () => ({ data: [] }),
  useBankReconSummary: () => ({ data: null }),
  useBankReconAggregate: () => ({ ledgerCount: 0, diffCount: 0, diffAmount: 0, openLines: 0, isLoading: false }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  test('Collections dunning workspace lists overdue customers from the board', () => {
    render(<CollectionsFollowup branch={{ code: 'BOM' }} />);
    expect(screen.getByText('ACME')).toBeInTheDocument();       // overdue customer from the board
    expect(screen.getByText('Send reminders to all')).toBeInTheDocument(); // dunning-run action
    expect(screen.queryByText('Globe')).toBeNull();             // board already excludes current ones
  });

  test('Dashboard cockpit: five workspace tabs + global period bar', () => {
    render(<DashboardAccountant branch={{ code: 'BOM' }} setRoute={() => {}} />);

    // Global period bar present (preset buttons).
    expect(screen.getByText('CFY')).toBeInTheDocument();
    expect(screen.getByText('LFY')).toBeInTheDocument();

    // Tab 1 — Overview (default): branch health rollup + approval status + headline tile
    expect(screen.getByText(/Branch Health/)).toBeInTheDocument();          // traffic-light card
    expect(screen.getByText(/Approval & posting status/)).toBeInTheDocument(); // status section
    expect(screen.getByText('Blocked')).toBeInTheDocument();                // status stat card
    expect(screen.getByText('Sales')).toBeInTheDocument();                  // performance headline tile
    expect(screen.getByText('Exception Radar')).toBeInTheDocument();
    expect(screen.getByText(/to approve & post/)).toBeInTheDocument();      // hero chip

    // Tab 4 — Receivable & Payable: keep the full R&P content
    fireEvent.click(screen.getByText('4. Receivable & Payable'));
    expect(screen.getByText('Accounts Receivable (Debtors)')).toBeInTheDocument();
    expect(screen.getByText('Accounts Payable (Creditors)')).toBeInTheDocument();
    expect(screen.getAllByText('Net Working Position').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹900').length).toBeGreaterThan(0);         // net = 1700 − 800

    // Receivable vs Payable comparison table — BOTH sides on ONE screen.
    expect(screen.getByText(/Receivable vs Payable/)).toBeInTheDocument();
    expect(screen.getByText('Total Billed')).toBeInTheDocument();
    expect(screen.getByText('Unsettled Bills (open)')).toBeInTheDocument();
    expect(screen.getByText('Unallocated / On-Account')).toBeInTheDocument();
    expect(screen.getAllByText('₹2,500').length).toBeGreaterThan(0);       // receivable Total Billed
    expect(screen.getAllByText('₹1,100').length).toBeGreaterThan(0);       // payable Total Billed

    // Both ageing rows visible together.
    expect(screen.getByText('Debtors (Receivable)')).toBeInTheDocument();
    expect(screen.getByText('Creditors (Payable)')).toBeInTheDocument();

    // Both bill-wise panels visible together.
    expect(screen.getByText('Open sales bills — awaiting receipt')).toBeInTheDocument();
    expect(screen.getByText('SF/001')).toBeInTheDocument();
    expect(screen.getByText('Open purchase bills — awaiting payment')).toBeInTheDocument();
    expect(screen.getByText('PB/009')).toBeInTheDocument();

    // Both settlement panels + both on-account sides + worklists.
    expect(screen.getByText('Clients — unsettled bills vs receipts')).toBeInTheDocument();
    expect(screen.getByText('Suppliers — unsettled bills vs payments')).toBeInTheDocument();
    expect(screen.getByText('Customer credits — unapplied receipts')).toBeInTheDocument();
    expect(screen.getByText('Supplier advances — unapplied payments')).toBeInTheDocument();
    expect(screen.getByText('Refunds & adjustments pending')).toBeInTheDocument();
    expect(screen.getByText('Top creditors — reconcile & pay')).toBeInTheDocument();

    // Tab 5 — Compliance: statutory tiles + GST/ITC + master health + RCM
    fireEvent.click(screen.getByText('5. Compliance'));
    expect(screen.getByText('TDS Payable')).toBeInTheDocument();
    expect(screen.getByText('Input Credit (ITC)')).toBeInTheDocument();
    expect(screen.getByText('RCM (Reverse Charge)')).toBeInTheDocument();
    expect(screen.getByText(/Master-data health/)).toBeInTheDocument();

    // Tab 2 — Performance: P&L snapshot + targets + budget
    fireEvent.click(screen.getByText('2. Performance'));
    expect(screen.getAllByText(/Revenue|Net Profit/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Targets vs Actual/)).toBeInTheDocument();        // FY targets panel
    expect(screen.getAllByText('no target set').length).toBeGreaterThan(0);   // config empty → unset
    expect(screen.getByText(/Budget vs Actual/)).toBeInTheDocument();

    // Tab 3 — Cash & Bank: cash + PDC
    fireEvent.click(screen.getByText('3. Cash & Bank'));
    expect(screen.getAllByText('Cash in Hand').length).toBeGreaterThan(0);
    expect(screen.getByText('Post-Dated Cheques (PDC)')).toBeInTheDocument();
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
