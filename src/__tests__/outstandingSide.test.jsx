// Outstanding & On-Account — `side` scoping (Option B, manual-only / no FIFO).
// The combined 4-tab screen is now embedded side-scoped as the "Open Bills &
// On-Account ▸ Settle" tab of Receivables (customer) and Payables (supplier).
// These tests lock in that a side shows ONLY its two tabs and never the other side.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/LedgerModalHost', () => ({ openLedgerModal: jest.fn() }));

const OUT = {
  salesBills: [{ party: 'ACME', billVno: 'S1', date: '2026-01-01', total: 1000, settled: 0, outstanding: 1000, ageDays: 100 }],
  purchaseBills: [{ party: 'TBO', billVno: 'P1', date: '2026-02-01', total: 800, settled: 0, outstanding: 800, ageDays: 20 }],
  onAccountReceipts: [{ id: 'r1', party: 'ACME', vno: 'R1', date: '2026-03-01', total: 500, allocated: 0, onAccount: 500, ageDays: 10, allocations: [] }],
  onAccountPayments: [
    { id: 'p1', party: 'TBO', vno: 'PM1', date: '2026-03-02', total: 300, allocated: 0, onAccount: 300, ageDays: 9, allocations: [] },
    { id: 'p2', party: 'Akbar Travels', vno: 'PM2', date: '2026-03-03', total: 700, allocated: 0, onAccount: 700, ageDays: 8, allocations: [] },
  ],
  totals: { salesOutstanding: 1000, purchaseOutstanding: 800, onAccountReceipts: 500, onAccountPayments: 1000 },
};
jest.mock('../core/useAccounting', () => ({
  useOutstanding: () => ({ data: OUT, isLoading: false, isError: false }),
  // One open bill + one OVER-settled bill (the party's Overpaid credit) — the settle
  // modal must show the credit for context but never offer to allocate against it.
  useOpenBills: () => ({ data: { bills: [
    { billId: 'b1', billVno: 'S9', date: '2026-01-01', total: 500, allocated: 0, outstanding: 500, status: 'pending', ageDays: 5 },
    { billId: 'b2', billVno: 'SF00838', date: '2026-01-19', total: 316375, allocated: 623216, outstanding: 0, status: 'overpaid', overpaidAmt: 306841, ageDays: 20 },
  ] }, isLoading: false }),
  useSettleAdvance: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutstandingOnAccount } from '../modules/reportsFinancial/outstanding';

const has = (re) => screen.queryAllByText(re).length > 0;

describe('OutstandingOnAccount — side scoping', () => {
  test("side='customer' shows ONLY the receivable tabs", () => {
    render(<OutstandingOnAccount branch="BOM" side="customer" />);
    expect(has(/Unsettled Sales Bills/)).toBe(true);
    expect(has(/On-Account Receipts/)).toBe(true);
    // payable side must be absent
    expect(has(/Unsettled Purchase Bills/)).toBe(false);
    expect(has(/On-Account Payments/)).toBe(false);
  });

  test("side='supplier' shows ONLY the payable tabs", () => {
    render(<OutstandingOnAccount branch="BOM" side="supplier" />);
    expect(has(/Unsettled Purchase Bills/)).toBe(true);
    expect(has(/On-Account Payments/)).toBe(true);
    expect(has(/Unsettled Sales Bills/)).toBe(false);
    expect(has(/On-Account Receipts/)).toBe(false);
  });

  test('no side → the whole-book view still shows all four tabs', () => {
    render(<OutstandingOnAccount branch="BOM" />);
    expect(has(/Unsettled Sales Bills/)).toBe(true);
    expect(has(/Unsettled Purchase Bills/)).toBe(true);
    expect(has(/On-Account Receipts/)).toBe(true);
    expect(has(/On-Account Payments/)).toBe(true);
  });

  // The settle modal shows an OVER-settled bill as the party's Overpaid credit —
  // visible (like the ledger bill-wise) but with no allocate box or Max button.
  test('settle modal lists Overpaid bills as a credit, not an allocatable row', () => {
    render(<OutstandingOnAccount branch="BOM" side="customer" initialTab="recAdv" />);
    fireEvent.click(screen.getByText('Settle bill-wise')); // open the modal for ACME's advance

    expect(has(/SF00838/)).toBe(true);            // the over-settled bill is listed
    expect(has(/Overpaid/)).toBe(true);           // flagged as the party's credit
    expect(has(/3,06,841/)).toBe(true);           // the credit amount is visible
    // Exactly ONE allocatable row (S9): one number input + one Max button.
    expect(document.querySelectorAll('input[type="number"]').length).toBe(1);
    expect(screen.queryAllByText('Max').length).toBe(1);
  });

  // Feature 3 — "Adjust advance" deep-link opens the on-account payments tab
  // focused on one supplier so only that supplier's advances are listed.
  test('initialTab + initialParty focuses one supplier on the on-account payments tab', () => {
    render(<OutstandingOnAccount branch="BOM" side="supplier" initialTab="payAdv" initialParty="Akbar Travels" />);
    expect(has(/Focused on Akbar Travels/)).toBe(true);
    expect(has(/PM2/)).toBe(true);   // Akbar's advance voucher shown
    expect(has(/PM1/)).toBe(false);  // TBO's advance filtered out
    expect(has(/show all parties/)).toBe(true); // clearable
  });
});
