// Sales/Purchase invoice PDF (buildBookingInvoice):
//  1. HSN/SAC code shown beside the summary + per-module breakdown columns.
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

  test('HSN / SAC code (air-ticketing SAC) shown beside the summary for a Flight (SF) booking (fallback)', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('HSN / SAC');
    expect(html).toContain('996421'); // SF → air ticketing SAC (built-in fallback)
  });

  test('Flight (SF) sale breakdown uses the SO voucher columns/labels', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Base Fare');            // spec.fareCols[0].label
    expect(html).toContain('K3');                   // spec.fareCols[1].label
    expect(html).toContain('Other Taxes');          // markup column
    expect(html).toContain('Service Chg');          // ssvc column (non-package)
    expect(html).toContain('GST/Service (18%)');    // gstSvc column at the module rate
    expect(html).toContain('GST/Other Taxes (18%)');
  });

  test('Hotel (SHT) sale breakdown renders its own fareCols + reference columns', () => {
    const hotel = { ...booking, module: 'SHT', rows: [{ fn: 'Priya', sn: 'Nair', htl: 'Taj', conf: 'HT55', base: 18000, tax: 900, markup: 2000, ssvc: 300 }] };
    const html = buildBookingInvoice(hotel, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Room / Basic'); // SHT fareCols[0].label
    expect(html).toContain('Hotel');        // idCols ref label
    expect(html).toContain('Conf. No');     // idCols ref label
  });

  test('Holiday package (SH) sale breakdown drops Service Charge and uses 5% GST', () => {
    const hol = { ...booking, module: 'SH', rows: [{ fn: 'Rahul', sn: 'Mehta', pkg: 'Bali 5N', ref: 'HL22', base: 85000, psvc: 1000, psvcGst: 180, markup: 12000 }] };
    const html = buildBookingInvoice(hol, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Land Package');             // SH fareCols[0].label
    expect(html).toContain('GST/Other Taxes (5%)');     // package rate
    expect(html).not.toContain('Service Chg');          // no service charge on the package model
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

  test('UPI Scan & Pay block (QR + VPA) renders on the sales invoice', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('UPI · Scan');
    expect(html).toContain('upi-qr.png');
    expect(html).toContain('MSTRAVKINGSTOURSTRAVELSPRIVATELIMITED.eazypay@icici');
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
  test('purchase invoice shows the HSN / SAC code and the PO voucher columns', () => {
    const html = buildBookingInvoice({ ...booking, purchaseVno: 'BOM/0626/PF00920', po: booking.so }, 'purchase', { code: 'BOM' }, {});
    expect(html).toContain('HSN / SAC');
    expect(html).toContain('996421');
    expect(html).toContain('Supplier Service');
    expect(html).toContain('Supplier Incentive');
    expect(html).toContain('TDS (2%)');
  });
});
