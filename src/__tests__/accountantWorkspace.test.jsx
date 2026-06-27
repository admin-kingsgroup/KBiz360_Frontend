// Accountant workspace — pure helpers + a render smoke test of two key screens.
// api/crmApi use import.meta (no babel plugin under jest); useAccounting is mocked
// so the screens render against fixed data with no network.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

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
jest.mock('../core/useReference', () => ({ useTaxCalendar: () => ({ data: [] }) }));
jest.mock('../core/useBankReco', () => ({
  useBankLedgers: () => ({ data: [] }),
  useBankReconSummary: () => ({ data: null }),
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

  test('Dashboard cockpit: three workspace tabs (daily money · collections ageing · compliance)', () => {
    render(<DashboardAccountant branch={{ code: 'BOM' }} setRoute={() => {}} />);
    // Tab 1 — Daily Operations (default): money position + worklist
    expect(screen.getAllByText('₹5,000').length).toBeGreaterThan(0);   // cash (also PDC pending / forecast inflow)
    expect(screen.getByText('₹90,000')).toBeInTheDocument();  // bank (Bank Account only, not Bank Charges)
    expect(screen.getByText('Collected Today')).toBeInTheDocument();
    expect(screen.getByText('Month-End Progress')).toBeInTheDocument();
    // Tier 1 additions: forward cash outlook, PDC tracker, approval split
    expect(screen.getByText(/Cash-flow Outlook/)).toBeInTheDocument();
    expect(screen.getByText('Post-Dated Cheques (PDC)')).toBeInTheDocument();
    expect(screen.getByText(/Approve & Post — worklist/)).toBeInTheDocument();
    expect(screen.getByText('Received — Pending')).toBeInTheDocument();
    // Hero worklist + maker/checker split
    expect(screen.getByText(/to approve & post/)).toBeInTheDocument();   // hero chip
    expect(screen.getByText(/I can approve/)).toBeInTheDocument();       // checker bucket
    expect(screen.getByText(/My own — needs approver/)).toBeInTheDocument(); // maker bucket

    // Tab 2 — Collections & Payables: headline snapshot (both sides + net 1700 − 800 = 900)
    fireEvent.click(screen.getByText('2. Collections & Payables'));
    expect(screen.getByText('Accounts Receivable (Debtors)')).toBeInTheDocument();
    expect(screen.getByText('Accounts Payable (Creditors)')).toBeInTheDocument();
    expect(screen.getAllByText('Net Working Position').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹900').length).toBeGreaterThan(0);

    // Receivable vs Payable comparison table — BOTH sides on ONE screen (no sub-tabs).
    // The receivable column must render (the reported bug): Total Billed R = ₹2,500.
    expect(screen.getByText(/Receivable vs Payable/)).toBeInTheDocument();
    expect(screen.getByText('Total Billed')).toBeInTheDocument();
    expect(screen.getByText('Unsettled Bills (open)')).toBeInTheDocument();
    expect(screen.getByText('Unallocated / On-Account')).toBeInTheDocument();
    expect(screen.getAllByText('₹2,500').length).toBeGreaterThan(0);   // receivable Total Billed shows
    expect(screen.getAllByText('₹1,100').length).toBeGreaterThan(0);   // payable Total Billed shows

    // Both ageing rows visible together (comparable), not behind tabs.
    expect(screen.getByText('Debtors (Receivable)')).toBeInTheDocument();
    expect(screen.getByText('Creditors (Payable)')).toBeInTheDocument();

    // Both bill-wise panels visible together: open sales bills AND open purchase bills.
    expect(screen.getByText('Open sales bills — awaiting receipt')).toBeInTheDocument();
    expect(screen.getByText('SF/001')).toBeInTheDocument();
    expect(screen.getByText('Open purchase bills — awaiting payment')).toBeInTheDocument();
    expect(screen.getByText('PB/009')).toBeInTheDocument();

    // Both settlement panels + both on-account sides + worklists, all on the one view.
    expect(screen.getByText('Clients — unsettled bills vs receipts')).toBeInTheDocument();
    expect(screen.getByText('Suppliers — unsettled bills vs payments')).toBeInTheDocument();
    expect(screen.getByText('Customer credits — unapplied receipts')).toBeInTheDocument();
    expect(screen.getByText('Supplier advances — unapplied payments')).toBeInTheDocument();
    expect(screen.getByText('Refunds & adjustments pending')).toBeInTheDocument();
    expect(screen.getByText('Top creditors — reconcile & pay')).toBeInTheDocument();

    // Tab 3 — Month-End & Compliance: statutory tiles + GST/ITC + P&L snapshot + master health
    fireEvent.click(screen.getByText('3. Month-End & Compliance'));
    expect(screen.getByText('TDS Payable')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,500').length).toBeGreaterThan(0);   // GST netPayable (tile + ITC panel)
    expect(screen.getByText('Input Credit (ITC)')).toBeInTheDocument();
    expect(screen.getByText('RCM (Reverse Charge)')).toBeInTheDocument();      // foreign-supplier reverse charge
    expect(screen.getByText('₹1,800')).toBeInTheDocument();                    // RCM IGST from mock
    expect(screen.getByText(/Match ITC vs GSTR-2B/)).toBeInTheDocument();
    expect(screen.getByText('Indian suppliers missing GSTIN')).toBeInTheDocument(); // master-health (server counts)
    expect(screen.getByText(/Branch P&L snapshot/)).toBeInTheDocument();
    expect(screen.getByText('Net Profit')).toBeInTheDocument();
    expect(screen.getByText('₹25,000')).toBeInTheDocument();           // net profit from module-PL
    expect(screen.getByText(/Master-data health/)).toBeInTheDocument();
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
