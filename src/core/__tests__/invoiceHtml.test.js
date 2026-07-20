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
jest.mock('../styleTokens', () => ({ bc: jest.fn(() => ({ cur: '₹' })) }));
const { companyProfile, hsnSacFor } = require('../referenceCache');
const { bc } = require('../styleTokens');

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
    expect(html).toContain('998551'); // SF → flight SAC from the Tax master (built-in fallback)
  });

  test('Flight (SF) sale breakdown uses the SO voucher columns/labels', () => {
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Base Fare');            // spec.fareCols[0].label
    expect(html).toContain('K3');                   // spec.fareCols[1].label
    expect(html).toContain('Taxes');                // merged fare-tax + margin column
    expect(html).toContain('Service Chg');          // ssvc column (non-package)
    expect(html).toContain('GST/Service (18%)');    // gstSvc column at the module rate
    expect(html).not.toContain('Other Taxes');      // margin folded into Taxes — no separate column
    expect(html).not.toContain('GST/Other Taxes');  // per-line markup-GST column dropped
  });

  test('Hotel (SHT) sale breakdown renders its own fareCols + reference columns', () => {
    const hotel = { ...booking, module: 'SHT', rows: [{ fn: 'Priya', sn: 'Nair', htl: 'Taj', conf: 'HT55', base: 18000, tax: 900, markup: 2000, ssvc: 300 }] };
    const html = buildBookingInvoice(hotel, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Base Fare');    // SHT fareCols[0].label (unified across modules)
    expect(html).toContain('Hotel');        // idCols ref label (module-specific)
    expect(html).toContain('Conf. No');     // idCols ref label (module-specific)
  });

  test('Holiday package (SH) sale breakdown drops Service Charge and uses 5% GST', () => {
    const hol = { ...booking, module: 'SH', rows: [{ fn: 'Rahul', sn: 'Mehta', pkg: 'Bali 5N', ref: 'HL22', base: 85000, psvc: 1000, psvcGst: 180, markup: 12000 }] };
    const html = buildBookingInvoice(hol, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('Package');                  // SH idCols ref label (module-specific)
    expect(html).toContain('Taxes');                    // merged column present
    expect(html).not.toContain('Service Chg');          // no service charge on the package model
    expect(html).not.toContain('GST/Other Taxes');      // per-line markup-GST column dropped
  });

  test('the live HSN/SAC master wins when loaded', () => {
    hsnSacFor.mockImplementation((mod) => (String(mod).toLowerCase() === 'flight' ? '996422' : ''));
    const html = buildBookingInvoice(booking, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('996422'); // from the live master, not the 998551 fallback
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

  test('Billed To shows the customer PAN (derived from the GSTIN) on an India invoice', () => {
    const b = { ...booking, customer: { name: 'NeuIQ Technologies Pvt Ltd', gstin: '27AABCN1234Q1Z5', ledgerGroup: 'B2B' } };
    const html = buildBookingInvoice(b, 'sale', { code: 'BOM' }, {});
    expect(html).toContain('PAN : AABCN1234Q'); // characters 3–12 of the 15-char GSTIN
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
    expect(html).toContain('998551');
    expect(html).toContain('Supplier Service');
    expect(html).toContain('Supplier Incentive');
    expect(html).toContain('TDS (2%)');
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
  beforeEach(() => { companyProfile.mockReturnValue({}); hsnSacFor.mockReturnValue(''); bc.mockReturnValue({ cur: '₹' }); });
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

  test('a stale/BOM-fallback company profile (cur_sym ₹) still prints $ on a USD branch — never ₹', () => {
    // The profile schema defaults cur_sym to '₹', and a missing NBO profile falls back to BOM's
    // (also ₹). The symbol MUST come from the regime, not the profile — otherwise a USD invoice
    // printed '₹1,130.00' under a "(USD)" header. This pins the regime-authoritative fix.
    companyProfile.mockReturnValue({ cur_sym: '₹', entity: 'Travkings', operAddr: 'Nairobi', gstin: '' });
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {});
    expect(html).toContain('NET TOTAL (USD)');
    expect(html).not.toContain('₹');   // regression: no rupee symbol anywhere on a USD invoice
    expect(html).toContain('$');       // amounts carry the USD symbol
  });

  test('the VAT-column % follows an amended VAT master (single source), not a hardcoded 16/18/16', () => {
    bc.mockReturnValue({ cur: '₹', vatRate: 15 });   // Owner amended Kenya VAT 16 → 15 in Masters ▸ Tax
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {});
    expect(html).toContain('(15%)');    // caption follows the master…
    expect(html).not.toContain('(16%)'); // …not the built-in constant
  });

  test('USD invoice spells the amount with international grouping — no Indian "Lakh"/"Crore"', () => {
    const big = { ...nbo, so: { lineTotal: 145000, serviceCharge: 900, gst: 1000, otherTaxesGst: 0, total: 146900 }, rows: [{ fn: 'Amani', sn: 'K', base: 145000, k3: 0, tax: 0, markup: 900 }] };
    const html = buildBookingInvoice(big, 'sale', { code: 'NBO' }, {});
    expect(html).toContain('Amount in Words');
    expect(html).not.toContain('Lakh');
    expect(html).not.toContain('Crore');
    expect(html).toMatch(/USD [A-Za-z ]*Thousand/);   // e.g. "USD One Hundred Forty Six Thousand …"
  });

  test('local-currency print converts every amount at the FX rate + footnote', () => {
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {}, { fxRate: 130, localCurrency: 'KES', fxDate: '2026-06-29' });
    expect(html).toContain('Converted at 1 USD = 130.00 KES');
    expect(html).toContain('NET TOTAL (KES)');
    expect(html).toContain('146,900.00'); // 1130 × 130, western grouping
  });
});
