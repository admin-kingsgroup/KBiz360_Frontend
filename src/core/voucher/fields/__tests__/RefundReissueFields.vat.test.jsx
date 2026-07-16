// FIX 1 (B2) — the Refund/Reissue voucher body must NOT show India GST slabs/labels on
// the Africa VAT branches (NBO/DAR/FBM). For a VAT branch it relabels GST→VAT / TDS→WHT,
// offers the branch's single VAT rate (not the Indian 0/5/12/18/28 slab list), and the
// currency symbol follows the branch. India (BOM) must stay exactly as before.
//
// Heavy children / network hooks are stubbed; the regime fork (real isVatBranch from
// voucherSpecs) and the money formatter (real ../ui) stay REAL so we test the real logic.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../styles', () => ({
  // FL renders its label as its OWN direct text node so getByText matches it precisely.
  FL: ({ label, children }) => <div><span>{label}</span>{children}</div>,
  inp: {},
  bc: (b) => {
    const code = (b && (b.code || b)) || '';
    if (code === 'DAR') return { cur: '$', vatRate: 18 };
    if (code === 'NBO' || code === 'FBM') return { cur: '$', vatRate: 16 };
    return { cur: '₹', vatRate: null };
  },
}));
jest.mock('../../../ux/SmartDateInput', () => ({ SmartDateInput: () => <input aria-label="date" /> }));
jest.mock('../../../../modules/transactions', () => ({ VPlaceOfSupply: () => null }));
jest.mock('../../LedgerPicker', () => ({ LedgerPicker: () => null }));
jest.mock('../../../api', () => ({ apiGet: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../../useAccounting', () => ({ useVoucherPreview: () => ({ data: {} }) }));
jest.mock('../../JvBlock', () => ({ JvBlock: () => null }));

import { RefundReissueFields } from '../RefundReissueFields';

const baseState = {
  date: '2026-07-01', againstInvoice: '', againstPurchase: '', gstMode: 'intra',
  party: '', counterParty: '', supplierAmt: '', serviceCharge: '', markup: '',
  gstPct: 18, supplierSvc: '', supplierGst: '', supplierCancel: '', cancelRecover: true,
  incentiveAmt: '', incentiveGst: '', incentiveTds: '', remarks: '',
};

function Harness({ ctx }) {
  const [state, setState] = React.useState(baseState);
  return <RefundReissueFields state={state} setState={setState} ctx={ctx} kind="refund" />;
}

describe('RefundReissueFields — India GST vs Africa VAT regime', () => {
  test('Africa VAT branch (NBO): VAT / WHT labels, single VAT rate, $ currency', () => {
    render(<Harness ctx={{ branch: { code: 'NBO' }, branchCode: 'NBO', cur: '$' }} />);

    // Rate control is labelled VAT, not GST
    expect(screen.getByText('VAT rate')).toBeInTheDocument();
    expect(screen.queryByText('GST rate')).toBeNull();

    // Single VAT rate — NOT the India slab list (no 12% / 28% options)
    expect(screen.queryByRole('option', { name: '28%' })).toBeNull();
    expect(screen.queryByRole('option', { name: '12%' })).toBeNull();
    expect(screen.getByRole('option', { name: '16%' })).toBeInTheDocument();

    // VAT captions + WHT wording (not GST / TDS)
    expect(screen.getByText(/^SVF VAT \(/)).toBeInTheDocument();
    expect(screen.getByText(/^SVC2 VAT \(/)).toBeInTheDocument();
    expect(screen.getByText(/^WHT reversed/)).toBeInTheDocument();
    expect(screen.queryByText(/^TDS reversed/)).toBeNull();

    // Currency symbol follows the branch → $
    expect(screen.getByText('Supplier refund ($)')).toBeInTheDocument();
  });

  test('India GST branch (BOM): GST / TDS labels, full slab list, ₹ currency (unchanged)', () => {
    render(<Harness ctx={{ branch: { code: 'BOM' }, branchCode: 'BOM', cur: '₹' }} />);

    expect(screen.getByText('GST rate')).toBeInTheDocument();
    expect(screen.queryByText('VAT rate')).toBeNull();

    // India keeps the full GST slab list
    expect(screen.getByRole('option', { name: '28%' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '12%' })).toBeInTheDocument();

    expect(screen.getByText(/^SVF GST \(/)).toBeInTheDocument();
    expect(screen.getByText(/^TDS reversed/)).toBeInTheDocument();
    expect(screen.queryByText(/^WHT reversed/)).toBeNull();

    // Currency symbol stays ₹
    expect(screen.getByText('Supplier refund (₹)')).toBeInTheDocument();
  });
});
