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
jest.mock('../core/useAccounting', () => ({ useVoucherPreview: () => ({ data: PREVIEW }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoucherLines } from '../modules/accountingLive.jsx';

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

  test('a zero side shows ₹0 (never blank) — multiple zero cells present', () => {
    render(<VoucherLines voucher={voucher} cur="₹" />);
    // party row credit=0, three head/tax rows debit=0 → at least 4 explicit ₹0 cells.
    expect(screen.getAllByText('₹0').length).toBeGreaterThanOrEqual(4);
  });

  test('does NOT dump raw line meta as "[object Object]" (full JV replaces head-line cards)', () => {
    render(<VoucherLines voucher={voucher} cur="₹" />);
    expect(screen.queryByText(/\[object Object\]/)).toBeNull();
  });
});
