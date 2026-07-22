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

  test('the VAT-column % reflects the BOOKED snapshot rate, not the live config (faithful reprint)', () => {
    const booked15 = { ...nbo, so: { ...nbo.so, vatRate: 15 } };   // this booking was billed at 15%
    const html = buildBookingInvoice(booked15, 'sale', { code: 'NBO' }, {});
    expect(html).toContain('(15%)');    // faithful to what was billed…
    expect(html).not.toContain('(16%)'); // …not the live rate or the built-in constant
  });

  test('a legacy booking with no stored vatRate falls back to the branch constant', () => {
    const html = buildBookingInvoice(nbo, 'sale', { code: 'NBO' }, {});   // nbo.so carries no vatRate
    expect(html).toContain('(16%)');    // NBO built-in constant = the rate in force when billed
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

describe('mergeLegRowsForSalePrint — clubbed Flight N-PO legs on the printed invoice', () => {
  const { mergeLegRowsForSalePrint } = require('../invoiceHtml');
  const { VSPECS } = require('../voucherSpecs');
  const spec = VSPECS.SF;
  const rows = [{ fn: 'ANUBHAV', sn: 'KUMAR', base: 10000, k3: 2000, tax: 500, markup: 1180, ssvc: 1000,
    sectors: [{ sector: 'BOM-DXB', airline: 'Emirates', flightNo: 'EK 501', ticketNo: 'TKT-1' }] }];
  const purchases = [
    { module: 'SF', rows: [{ fn: 'ANUBHAV', sn: 'KUMAR', base: 8000, k3: 1600, tax: 400,
      sectors: [{ sector: 'DXB-FIH', airline: 'FlyDubai', flightNo: 'FZ 655', ticketNo: 'TKT-2' }] }] },
    { module: 'SM', rows: [{ base: 999 }] },   // Misc leg — cost-only, never printed on the sale
    { module: 'SF', rows: [{ fn: 'PRIYA', sn: 'SHARMA', base: 5000, tax: 250,
      sectors: [{ sector: 'FIH-DAR', airline: 'Kenya Airways', flightNo: 'KQ 553', ticketNo: 'TKT-3' }] }] },
  ];

  test('same passenger → fares club into the row, sectors append; totals foot to the clubbed SO', () => {
    const out = mergeLegRowsForSalePrint(rows, purchases, spec);
    const anubhav = out.find((r) => r.fn === 'ANUBHAV');
    expect(anubhav.base).toBe(18000);
    expect(anubhav.k3).toBe(3600);
    expect(anubhav.tax).toBe(900);
    expect(anubhav.markup).toBe(1180);        // service charges untouched
    expect(anubhav.sectors.map((s) => s.sector)).toEqual(['BOM-DXB', 'DXB-FIH']);
  });

  test('a leg passenger not on the main grid gets an own fares-only row', () => {
    const out = mergeLegRowsForSalePrint(rows, purchases, spec);
    const priya = out.find((r) => r.fn === 'PRIYA');
    expect(priya).toBeTruthy();
    expect(priya.base).toBe(5000);
    expect(priya.markup).toBe(0);
    expect(priya.sectors[0].sector).toBe('FIH-DAR');
  });

  test('Misc legs and non-flight bookings are never merged', () => {
    const out = mergeLegRowsForSalePrint(rows, purchases, spec);
    expect(out.some((r) => r.base === 999)).toBe(false);
    expect(mergeLegRowsForSalePrint(rows, purchases, VSPECS.SH)).toBe(rows);  // no sectors spec → untouched
  });

  test('rendered sale HTML shows the leg sectors + clubbed fares', () => {
    const b = {
      branch: 'BOM', module: 'SF', date: '2026-07-18', saleVno: 'SV/1', gstMode: 'intra',
      customer: { name: 'ACME', ledgerGroup: 'B2B' },
      so: { lineTotal: 29750, serviceCharge: 1000, gst: 180, otherTaxesGst: 180, tcs: 0, total: 30110 },
      rows, purchases,
    };
    const html = buildBookingInvoice(b, 'sale', 'BOM');
    expect(html).toContain('DXB-FIH');
    expect(html).toContain('FIH-DAR');
    expect(html).toContain('TKT-3');
    expect(html).toContain('18,000');          // Anubhav's clubbed base fare
  });
});

describe('buildBookingInvoice — reversal (RF/RI) invoice', () => {
  beforeEach(() => { companyProfile.mockReturnValue({}); hsnSacFor.mockReturnValue(''); });

  // Mirrors the live Kesar Craft refund: supplierAmt 28,323 − charges (100+236)
  // − their 18% GST (60.48) = net refund 27,926.52.
  const refund = {
    branch: 'AMD', module: 'RF', date: '2026-06-28', saleVno: 'AMD/0726/RF00001',
    linkNo: 'AMD/0726/SF00098', gstMode: 'intra', againstInvoice: 'AMD/0726/SF00098',
    customer: { name: 'KESAR CRAFT PACKAGING PRIVATE LIMITED', ledgerGroup: 'Sundry Debtors' },
    reversal: {
      supplierAmt: 28323, serviceCharge: 100, otherTaxes: 236, gstPct: 18, gstMode: 'intra',
      supplierSvc: 0, supplierGst: 0, supplierCancel: 0, supplierCancelGst: 0,
      cancelRecover: true, againstInvoice: 'AMD/0726/SF00098',
    },
    rows: [],
  };

  test('refund booking renders its reversal figures, not an empty table', () => {
    const html = buildBookingInvoice(refund, 'sale', { code: 'AMD' }, {});
    expect(html).toContain('REFUND INVOICE');
    expect(html).toContain('Refund Breakdown');
    expect(html).toContain('28,044.52');                 // refund value with SVC2 (+its GST) folded in: 28,323 − 236 − 42.48
    expect(html).toContain('100.00');                    // service charge line = ONLY the service charge
    expect(html).not.toContain('336.00');                // the SVC2 fold is never revealed
    expect(html).toContain('27,926.52');                 // net refund (unchanged by the fold)
    expect(html).toContain('Less: CGST');                // intra split of the 18.00 service-charge GST
    expect(html).toContain('9.00');
    expect(html).toContain('NET REFUND (INR)');
    expect(html).toContain('AMD/0726/SF00098');          // against invoice
    expect(html).not.toContain('No line detail captured');
    expect(html).toContain('Bank Details');              // bank + UPI stay on the refund print
    expect(html).toContain('UPI');
  });

  test('passenger + sector context rides in from the original sale (opts.original)', () => {
    const original = { rows: [{ fn: 'SUBASINI', sn: 'KUMBHAR', sectors: [{ sector: 'BBI-AMD', airline: 'INDIGO', pnr: '07W3KS', travelDate: '2026-07-01' }] }] };
    const html = buildBookingInvoice(refund, 'sale', { code: 'AMD' }, {}, { original });
    expect(html).toContain('Passengers');
    expect(html).toContain('SUBASINI KUMBHAR');
    expect(html).toContain('BBI-AMD');
    expect(html).toContain('07W3KS');
  });

  test('recovered cancellation shows as its own deduction', () => {
    const withCancel = { ...refund, reversal: { ...refund.reversal, supplierCancel: 1000, supplierCancelGst: 180 } };
    const html = buildBookingInvoice(withCancel, 'sale', { code: 'AMD' }, {});
    expect(html).toContain('Cancellation');
    expect(html).toContain('1,180.00');                  // penalty + GST recovered from customer
    expect(html).toContain('26,746.52');                 // 27,926.52 − 1,180
  });

  test('reissue (RI) bills the customer: charges ADD and total is NET PAYABLE', () => {
    const reissue = { ...refund, module: 'RI', saleVno: 'AMD/0726/RI00001' };
    const html = buildBookingInvoice(reissue, 'sale', { code: 'AMD' }, {});
    expect(html).toContain('REISSUE INVOICE');
    expect(html).toContain('28,601.48');                 // reissue value with SVC2 (+its GST) folded in: 28,323 + 236 + 42.48
    expect(html).toContain('Add: Service Charges');
    expect(html).toContain('NET PAYABLE (INR)');
    expect(html).toContain('28,719.48');                 // 28,323 + 336 + 60.48 (net unchanged by the fold)
    expect(html).toContain('Bank Details');              // customer pays → bank block stays
  });
});
