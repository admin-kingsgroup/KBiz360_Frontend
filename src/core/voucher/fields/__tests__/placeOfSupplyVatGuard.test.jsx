// Place of Supply is an INDIA-GST concept (intra = CGST+SGST / inter = IGST). An Africa
// (VAT) branch has a single VAT rate and no such split, so the toggle must not render there.
//
// WHY THIS FILE EXISTS: the sibling suite (RefundReissueFields.vat.test.jsx) stubs
// VPlaceOfSupply to `null`, so it could never see the toggle — which is exactly how the leak
// survived a green suite. Here we stub it to a VISIBLE MARKER so its presence/absence is
// actually asserted. The regime fork (real isVatBranch from voucherSpecs) stays REAL.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../styles', () => ({
  FL: ({ label, children }) => <div><span>{label}</span>{children}</div>,
  inp: {}, lockedInp: {}, btnGh: {}, card: {},
  bc: (b) => {
    const code = (b && (b.code || b)) || '';
    if (code === 'DAR') return { cur: '$', vatRate: 18 };
    if (code === 'NBO' || code === 'FBM') return { cur: '$', vatRate: 16 };
    return { cur: '₹', vatRate: null };
  },
}));
// The marker: if the India-only toggle renders, this text appears.
jest.mock('../../../../modules/transactions', () => ({ VPlaceOfSupply: () => <div>PLACE-OF-SUPPLY-TOGGLE</div> }));
jest.mock('../../../ux/SmartDateInput', () => ({ SmartDateInput: () => <input aria-label="date" /> }));
jest.mock('../../../ux/Menu', () => ({ Menu: () => null }));
jest.mock('../../LedgerPicker', () => ({ LedgerPicker: () => null }));
jest.mock('../../useVoucherRef', () => ({ useVoucherRef: () => ({ tdsSections: { None: { label: 'None', rate: 0 } }, gstSlabs: [0, 5, 12, 18, 28] }) }));
jest.mock('../../../api', () => ({ apiGet: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../../useAccounting', () => ({ useVoucherPreview: () => ({ data: {} }) }));
jest.mock('../../JvBlock', () => ({ JvBlock: () => null }));

import { PurchaseExpenseFields } from '../PurchaseExpenseFields';

const pxpState = () => ({
  date: '', billNo: '', party: '', gstApplicable: true, gstMode: 'intra', gstPct: 18, gstAmt: 0,
  tdsSection: 'None', tdsAmt: 0, remarks: '', attachments: [],
  lines: [{ _k: 1, ledger: 'Office Rent', drCr: 'Dr', amt: 1000, desc: '' }],
});

describe('Place of Supply is India-only (Purchase-Expense)', () => {
  test('India (BOM) still renders the Place of Supply toggle', () => {
    render(<PurchaseExpenseFields state={pxpState()} setState={() => {}} ctx={{ branch: { code: 'BOM' }, branchCode: 'BOM', cur: '₹' }} />);
    expect(screen.getByText('PLACE-OF-SUPPLY-TOGGLE')).toBeTruthy();
    expect(screen.getByText('GST applicable (input credit)')).toBeTruthy();
  });

  test('Africa (NBO) hides it — a VAT branch has no intra/inter split', () => {
    render(<PurchaseExpenseFields state={pxpState()} setState={() => {}} ctx={{ branch: { code: 'NBO' }, branchCode: 'NBO', cur: '$' }} />);
    expect(screen.queryByText('PLACE-OF-SUPPLY-TOGGLE')).toBeNull();
    expect(screen.getByText('VAT applicable (input credit)')).toBeTruthy();
  });
});

describe('Africa VAT purchase cannot silently post zero input tax', () => {
  test('NBO with a taxable line but no VAT amount warns to Auto-calc', () => {
    render(<PurchaseExpenseFields state={pxpState()} setState={() => {}} ctx={{ branch: { code: 'NBO' }, branchCode: 'NBO', cur: '$' }} />);
    expect(screen.getByText(/VAT amount is 0/i)).toBeTruthy();
  });

  test('India is untouched — no such warning (its slab dropdown auto-fills)', () => {
    render(<PurchaseExpenseFields state={pxpState()} setState={() => {}} ctx={{ branch: { code: 'BOM' }, branchCode: 'BOM', cur: '₹' }} />);
    expect(screen.queryByText(/amount is 0/i)).toBeNull();
  });

  test('the warning clears once the VAT amount is filled', () => {
    render(<PurchaseExpenseFields state={{ ...pxpState(), gstAmt: 160 }} setState={() => {}} ctx={{ branch: { code: 'NBO' }, branchCode: 'NBO', cur: '$' }} />);
    expect(screen.queryByText(/VAT amount is 0/i)).toBeNull();
  });
});

describe('VAT rate is seeded from the branch on CREATE only', () => {
  test('a NEW NBO purchase seeds gstPct to the branch rate (16), not India’s 18', () => {
    const calls = [];
    render(<PurchaseExpenseFields state={pxpState()} setState={(fn) => calls.push(fn(pxpState()))} ctx={{ branch: { code: 'NBO' }, branchCode: 'NBO', cur: '$' }} />);
    expect(calls.some((s) => +s.gstPct === 16)).toBe(true);
  });

  test('EDITING an existing voucher never re-rates it (gstPct feeds the Rate-Wise report)', () => {
    const calls = [];
    // A voucher legitimately posted at 20% (e.g. before a VAT-master amendment) must keep it.
    render(<PurchaseExpenseFields state={{ ...pxpState(), gstPct: 20, gstAmt: 200 }} setState={(fn) => calls.push(fn({ ...pxpState(), gstPct: 20 }))} ctx={{ branch: { code: 'NBO' }, branchCode: 'NBO', cur: '$', editId: 'v-123' }} />);
    expect(calls.some((s) => +s.gstPct === 16)).toBe(false);
  });
});
