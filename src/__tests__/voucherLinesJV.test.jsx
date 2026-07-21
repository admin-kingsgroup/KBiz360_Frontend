// The "open JV" popup (VoucherLines) must show the FULL journal — every ledger of
// the balanced entry (party Dr, each head Cr, GST) — and render a zero side as ₹0
// rather than hiding it. Applies to both Sales and Purchase vouchers.
//
// api/crmApi use import.meta (no babel plugin under jest); useAccounting is mocked
// so useVoucherPreview returns a fixed balanced journal without the network.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

const PREVIEW = {
  postings: [
    { ledger: 'B2C Ref Lamya', group: 'Sundry Debtors', debit: 46284, credit: 0 },
    { ledger: 'IT-Base Fare', group: 'Sales - Tickets', debit: 0, credit: 26234 },
    { ledger: 'IT-Service Charges', group: 'Sales - Tickets', debit: 0, credit: 500 },
    { ledger: 'CGST Output [AMD]', group: 'Duties & Taxes', debit: 0, credit: 45 },
  ],
  totalDebit: 46284, totalCredit: 46284, balanced: true, diff: 0,
};
// A POSTED voucher must render the ACTUAL stored journal (JournalEntry) via
// useVoucherJournal, NOT the live re-preview — so the popup ties out to the ledger
// statement / Day Book / Tally. This STORED fixture deliberately differs from PREVIEW.
const STORED = {
  postings: [
    { ledger: 'IT-SVF [Pur]', group: 'Purchase Accounts', debit: 100, credit: 0 },
    { ledger: 'Sales Refunds', group: 'Sales Accounts', debit: 0, credit: 100 },
  ],
  totalDebit: 100, totalCredit: 100, balanced: true, diff: 0,
};
jest.mock('../core/useAccounting', () => ({
  useVoucherPreview: () => ({ data: PREVIEW }),
  // Mirrors the real hook's `enabled` gate: only a posted voucher passes { id, vno }.
  useVoucherJournal: (arg) => ({ data: arg && (arg.id || arg.vno) ? STORED : undefined, isLoading: false }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoucherLines } from '../modules/accountingLive';

const voucher = {
  vno: 'AMD/0626/SF00056', type: 'SF', category: 'sale', branch: 'AMD', date: '2026-06-16',
  party: 'B2C Ref Lamya', linkNo: 'IS/26-27/0007', subtotal: 46194, taxAmt: 90, total: 46284,
  locked: true, source: 'booking', bookingId: 'BKG/AMD/26/0064',
  lines: [{ ledger: 'IT-Base Fare', amt: 26234, meta: { detail: { a: 1 }, serviceCharge: 500 } }],
};

describe('VoucherLines — full JV with zeros shown as ₹0', () => {
  test('renders every ledger of the full journal (party + heads + GST)', () => {
    render(<VoucherLines voucher={voucher} cur="₹" />);
    // Party shows in both the header field AND as the debit ledger row → at least 2.
    expect(screen.getAllByText('B2C Ref Lamya').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('IT-Base Fare')).toBeInTheDocument();     // head credit
    expect(screen.getByText('CGST Output [AMD]')).toBeInTheDocument(); // tax credit
    expect(screen.getByText('✓ Balanced')).toBeInTheDocument();
  });

  test('renders each leg once on its Dr/Cr side (shared T-account, no ₹0 fillers)', () => {
    render(<VoucherLines voucher={voucher} cur="₹" />);
    // The unified JvBlock shows each ledger once on its side with a 2-decimal amount;
    // there are no zero-fillers (a leg simply doesn't appear on its empty side).
    expect(screen.getAllByText('46,284.00').length).toBeGreaterThanOrEqual(1); // party Dr (+ totals)
    expect(screen.getByText('26,234.00')).toBeInTheDocument();                 // base fare Cr
    expect(screen.getByText('Dr · Debit')).toBeInTheDocument();
    expect(screen.getByText('Cr · Credit')).toBeInTheDocument();
    expect(screen.queryByText('₹0')).toBeNull();
  });

  test('does NOT dump raw line meta as "[object Object]" (full JV replaces head-line cards)', () => {
    render(<VoucherLines voucher={voucher} cur="₹" />);
    expect(screen.queryByText(/\[object Object\]/)).toBeNull();
  });

  test('a POSTED voucher renders the STORED journal (JournalEntry), not the live re-preview', () => {
    // status:'approved' → the popup reads useVoucherJournal (stored) instead of the preview,
    // so it shows the posted head (IT-SVF [Pur]) and NOT the re-preview ledgers.
    render(<VoucherLines voucher={{ ...voucher, id: 'v1', status: 'approved', category: 'refund' }} cur="₹" />);
    expect(screen.getByText('IT-SVF [Pur]')).toBeInTheDocument();   // from the stored journal
    expect(screen.getByText('Sales Refunds')).toBeInTheDocument();
    expect(screen.queryByText('IT-Base Fare')).toBeNull();          // a re-preview-only ledger must NOT appear
    expect(screen.getByText('✓ Balanced')).toBeInTheDocument();
  });
});
