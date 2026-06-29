// Sales/Purchase invoice PDF (buildBookingInvoice):
//  1. HSN/SAC column + per-module SAC code.
//  2. Issued-By details render even when the live company-profile cache is EMPTY
//     (seeded fallback) — the BOM "issued by blank" bug.
//  3. Place of Supply shown.
//  4. Bank details shown at the bottom.
// referenceCache/styleTokens are mocked so the pure HTML builder loads without the
// reference hydration chain.
import { buildBookingInvoice } from '../invoiceHtml';

jest.mock('../referenceCache', () => ({ companyProfile: jest.fn(() => ({})), hsnSacFor: jest.fn(() => '') }));
jest.mock('../styleTokens', () => ({ bc: () => ({ cur: '₹' }) }));
const { companyProfile, hsnSacFor } = require('../referenceCache');

const booking = {
  branch: 'BOM', module: 'SF', date: '2026-06-18', saleVno: 'BOM/0626/SF00920', linkNo: 'LK/BOM/00211', gstMode: 'intra',
  customer: { name: 'ACME Travels', gstin: '', ledgerGroup: 'B2B' },
  so: { lineTotal: 1000, serviceCharge: 100, gst: 180, tcs: 0, total: 1280 },
  rows: [{ fn: 'John', sn: 'Doe', base: 1000, k3: 0, tax: 0, markup: 100 }],
};

describe('buildBookingInvoice — sales invoice', () => {
  beforeEach(() => { companyProfile.mockReturnValue({}); hsnSacFor.mockReturnValue(''); }); // caches empty → fallback path

  test('HSN/SAC column header + the air-ticketing SAC for a Flight (SF) booking (fallback)', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('HSN/SAC');
    expect(html).toContain('996421'); // SF → air ticketing SAC (built-in fallback)
  });

  test('the live HSN/SAC master wins when loaded', () => {
    hsnSacFor.mockImplementation((mod) => (String(mod).toLowerCase() === 'flight' ? '996422' : ''));
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('996422'); // from the live master, not the 996421 fallback
  });

  test('Issued By renders BOM issuer details from the seeded fallback when the profile cache is empty', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Issued By');
    expect(html).toContain('27AAMCT1096J1ZU');            // GSTIN
    expect(html).toContain('Venus Tower');                // operating address
    expect(html).toContain('accounts.bom@travkings.com'); // email
    expect(html).toContain('+91 88280 06599');            // phone
  });

  test('Place of Supply is shown (falls back to issuer state for a no-GSTIN customer)', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Place of Supply');
    expect(html).toContain('Maharashtra — 27');
  });

  test('ICICI bank details (with account name) render at the bottom', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Bank Details');
    expect(html).toContain('ICICI Bank');
    expect(html).toContain('A/c Name:');
    expect(html).toContain('Travels Private Limited'); // A/c name (ampersand is HTML-escaped)
    expect(html).toContain('333805003566');  // A/c no
    expect(html).toContain('ICIC0003338');   // IFSC
    expect(html).toContain('ICICINBBCTS');   // SWIFT
  });

  test('a live company-profile overrides the fallback field-by-field', () => {
    companyProfile.mockReturnValue({ gstin: '27LIVE0000A1Z9', operAddr: 'Live Address 1', email: 'live@x.com', phone: '+91 90000 00000', entity: 'Travkings', cur_sym: '₹', banks: [{ bankName: 'Axis Bank', ifsc: 'UTIB0001', acNo: '999', primary: true }] });
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('27LIVE0000A1Z9'); // live GSTIN wins
    expect(html).toContain('Axis Bank');       // live bank wins
    expect(html).not.toContain('27AAMCT1096J1ZU');
  });
});

describe('buildBookingInvoice — purchase invoice', () => {
  beforeEach(() => { companyProfile.mockReturnValue({}); hsnSacFor.mockReturnValue(''); });
  test('purchase invoice also carries the HSN/SAC column', () => {
    const html = buildBookingInvoice({ ...booking, purchaseVno: 'BOM/0626/PF00920', po: booking.so }, 'purchase', { code: 'BOM' }, {});
    expect(html).toContain('HSN/SAC');
    expect(html).toContain('996421');
  });
});

describe('buildBookingInvoice — hidden-margin fold (everywhere)', () => {
  beforeEach(() => { companyProfile.mockReturnValue({}); hsnSacFor.mockReturnValue(''); });
  test('India sale never shows a Service Charge - 2 / SVC2 column (folded into Taxes)', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).not.toContain('Service Charge - 2');
    expect(html).not.toContain('SVC2');
  });
});

describe('buildBookingInvoice — Africa VAT branch (NBO)', () => {
  beforeEach(() => { companyProfile.mockReturnValue({}); hsnSacFor.mockReturnValue(''); });
  const nbo = {
    branch: 'NBO', module: 'SF', date: '2026-06-18', saleVno: 'NBO/0626/SF0001', linkNo: 'LK/NBO/0001',
    customer: { name: 'Safari Ltd', gstin: 'P051234567X', ledgerGroup: 'B2B' },
    so: { lineTotal: 1000, serviceCharge: 100, gst: 16, otherTaxesGst: 14, total: 1130 },
    rows: [{ fn: 'Amani', sn: 'K', base: 1000, k3: 0, tax: 0, markup: 100 }],
  };

  test('shows a single VAT line — no GST/CGST/SGST and no Place of Supply', () => {
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {});
    expect(html).toContain('>VAT<');           // one VAT line in the summary
    expect(html).not.toContain('CGST');
    expect(html).not.toContain('SGST');
    expect(html).not.toContain('Place of Supply');
  });

  test('party tax id is labelled VAT Reg No, never GSTIN', () => {
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {});
    expect(html).toContain('VAT Reg No');
    expect(html).not.toContain('GSTIN');
  });

  test('SVC2 margin hidden + NET TOTAL in USD (books currency)', () => {
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {});
    expect(html).not.toContain('Service Charge - 2');
    expect(html).toContain('NET TOTAL (USD)');
  });

  test('local-currency print converts every amount at the FX rate + footnote', () => {
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {}, { fxRate: 130, localCurrency: 'KES', fxDate: '2026-06-29' });
    expect(html).toContain('Converted at 1 USD = 130.00 KES');
    expect(html).toContain('NET TOTAL (KES)');
    expect(html).toContain('146,900.00'); // 1130 × 130, western grouping
  });
});
