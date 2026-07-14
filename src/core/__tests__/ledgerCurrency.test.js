// Regression: the Ledger Account must show the branch currency symbol in BOTH
// the ledger and bill-wise views (and screen == print). The `cur` prop used to
// be threaded in but never rendered, so an Africa (USD) branch's statement
// showed bare numbers with no "$".
//
// We exercise the print HTML builder (printLedgerUI) since it carries the same
// markup as the on-screen view; mock the heavy imports so the module loads.
jest.mock('../period', () => ({ PeriodBar: () => null }));
jest.mock('../useAccounting', () => ({
  useLedgerStatement: jest.fn(), useOpenBills: jest.fn(),
  useLedgerSplit: jest.fn(), useLedgerComponents: jest.fn(),
  branchCode: jest.fn(() => 'NBO'),
}));
jest.mock('../styleTokens', () => ({ bc: () => ({ cur: '$' }) }));
jest.mock('../PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../BookingFolderHost', () => ({ openBookingFolder: jest.fn() }));

import { openPrintPreview } from '../PrintPreview';
import { printLedgerUI } from '../ledgerUI';

const STMT = {
  ledger: 'Acme Travel NBO', group: 'Sundry Debtors',
  openingBalance: 1000, openingSide: 'Dr',
  lines: [{ date: '01-04-2026', vno: 'NBO/0126/SF00001', debit: 500, credit: 0, category: 'sales' }],
  totalDebit: 500, totalCredit: 0, closingBalance: 1500, closingSide: 'Dr',
};

afterEach(() => jest.clearAllMocks());

describe('printLedgerUI — currency symbol in headers and summary', () => {
  test('ledger view stamps the $ symbol on amount headers and totals', () => {
    printLedgerUI({ d: STMT, cur: '$', from: '2026-04-01', to: '2026-06-30' });
    const html = openPrintPreview.mock.calls[0][0].html;
    expect(html).toContain('Debit ($)');
    expect(html).toContain('Credit ($)');
    expect(html).toContain('Balance ($)');
    // summary card values carry the symbol (e.g. "$1,500")
    expect(html).toMatch(/\$\s?1,?500/);
  });

  test('defaults to ₹ when no currency is supplied (India / back-compat)', () => {
    printLedgerUI({ d: STMT, from: '2026-04-01', to: '2026-06-30' });
    const html = openPrintPreview.mock.calls[0][0].html;
    expect(html).toContain('Debit (₹)');
  });

  test('bill-wise view also stamps the currency on amount headers', () => {
    printLedgerUI({
      d: STMT, view: 'bill', side: 'customer', cur: '$',
      bills: [{ ref: 'INV-1', bdate: '01-04-2026', amt: 1000, settled: 0, pend: 1000, age: 12 }],
      from: '2026-04-01', to: '2026-06-30',
    });
    const html = openPrintPreview.mock.calls[0][0].html;
    expect(html).toContain('Bill Amount ($)');
    expect(html).toContain('Pending ($)');
  });
});
