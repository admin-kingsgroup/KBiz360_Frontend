// Sales / Purchase Register "SO/PO/GP Capture" sheet — column + row contract for
// the four register changes: (1) a Sales/Purchase Type column appears before
// Client Type only when All-modules is shown, (2) every row carries the voucher
// (_v) so Final Invoice Value can open its JV, (3) every row carries its booking
// (_booking) so the per-row invoice can print, (4) a trailing Invoice column.
// api.js / crmApi.js use import.meta.env (no babel plugin under Jest); accountingLive
// pulls them in transitively. buildCaptureSheet is pure and never calls them — mock so
// the module loads. (Same pattern as core/__tests__/useVouchers.adapter.test.js.)
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { buildCaptureSheet } from '../modules/accountingLive';

const linkIndex = { saleByLink: { LK1: 'SF1' }, purByLink: { LK1: 'PF1' }, saleRefByLink: { LK1: 'IS/01' }, purRefByLink: { LK1: 'IP/01' } };
const booking = { linkNo: 'LK1', bookingNo: 'BKG1', so: { total: 1000 }, customer: { name: 'ACME' } };
const bookingByLink = { LK1: booking };

const saleVoucher = {
  vno: 'SF1', type: 'SF', branch: 'BOM', linkNo: 'LK1', gstMode: 'intra',
  total: 1180, taxAmt: 180, partyGroup: 'B2B', party: 'ACME',
  lines: [{ ledger: 'IT-Base Fare', amt: 1000 }], // IT- prefix → International
};
const keyset = (sheet) => sheet.columns.map((c) => c.key);

describe('buildCaptureSheet — register capture columns & row refs', () => {
  test('Lead columns follow the fixed business order (Date ▸ Sales Type ▸ Ledger ▸ Invoice Value ▸ Link No ▸ Sales Invoice No ▸ Purchase Invoice No)', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(keyset(sheet).slice(0, 7)).toEqual([
      'saleDate', 'salesType', 'clientLedger', 'finalValue', 'linkNo', 'saleVno', 'purVno',
    ]);
    expect(sheet.rows[0].salesType).toBe('Flight'); // productOf(SF)
  });

  test('Purchase register: same lead order, labelled for the purchase side', () => {
    const purVoucher = { ...saleVoucher, vno: 'PF1', type: 'PF' };
    const sheet = buildCaptureSheet([purVoucher], { tab: 'purchase', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(keyset(sheet).slice(0, 7)).toEqual([
      'saleDate', 'salesType', 'clientLedger', 'finalValue', 'linkNo', 'saleVno', 'purVno',
    ]);
    expect(sheet.columns.find((c) => c.key === 'saleDate').label).toBe('Purchase Date');
    expect(sheet.columns.find((c) => c.key === 'salesType').label).toBe('Purchase Type');
    expect(sheet.columns.find((c) => c.key === 'clientLedger').label).toBe('Vendor Ledger');
    expect(sheet.columns.find((c) => c.key === 'finalValue').label).toBe('Final Bill Value');
  });

  test('All modules: INT/DOM is present and carries the route class', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    const keys = keyset(sheet);
    expect(keys).toContain('intDom');
    expect(keys.indexOf('intDom')).toBe(keys.indexOf('clientType') - 1); // INT/DOM still sits just before Client Type
    expect(sheet.columns.find((c) => c.key === 'intDom').label).toBe('INT / DOM');
    expect(sheet.rows[0].intDom).toBe('INT');         // IT- ledger prefix
  });

  test('INT/DOM follows the booking packageType when present (Domestic)', () => {
    const dom = { ...booking, packageType: 'Domestic' };
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink: { LK1: dom }, showType: true });
    expect(sheet.rows[0].intDom).toBe('DOM');
  });

  test('Single module (showType false): Sales Type stays (always shown), only INT/DOM drops', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: false });
    expect(keyset(sheet)).toContain('salesType');     // Sales Type is now always the 2nd column
    expect(keyset(sheet)[1]).toBe('salesType');
    expect(keyset(sheet)).not.toContain('intDom');    // INT/DOM remains All-modules only
  });

  test('Refund (RF) / Reissue (RI) vouchers label as Refund / Reissue in the type column', () => {
    const rf = { ...saleVoucher, vno: 'RF1', type: 'RF' };
    const sheet = buildCaptureSheet([rf], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(sheet.rows[0].salesType).toBe('Refund');
  });

  test('Final Invoice Value column exists and each row back-references its voucher (for the JV) and booking (for the invoice)', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(keyset(sheet)).toContain('finalValue');
    expect(sheet.rows[0].finalValue).toBe(1180);
    expect(sheet.rows[0]._v).toBe(saleVoucher);
    expect(sheet.rows[0]._booking).toBe(booking);
  });

  test('Final Invoice Value prefers partyNet (the JV\'s net client-ledger figure on a refund) over the gross total', () => {
    // A posted refund: header total is the GROSS reversal (60,518) but the JV nets the
    // customer to their true refund payable (51,370) — the column must show the latter,
    // matching the JV popup it opens. Unposted refunds carry no partyNet → gross total.
    const rf = { ...saleVoucher, vno: 'RF1', type: 'RF', total: 60518, partyNet: 51370.01 };
    const sheet = buildCaptureSheet([rf, saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(sheet.rows[0].finalValue).toBe(51370.01);
    expect(sheet.rows[1].finalValue).toBe(1180);      // plain sale: unchanged
    expect(sheet.totals.finalValue).toBe(52550.01);   // footer follows the shown figures
  });

  test('Sale Date column carries the voucher date (labelled per side)', () => {
    const dated = { ...saleVoucher, date: '16-Mar-26' };
    const sale = buildCaptureSheet([dated], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(keyset(sale)).toContain('saleDate');
    expect(sale.columns.find((c) => c.key === 'saleDate').label).toBe('Sale Date');
    expect(sale.rows[0].saleDate).toBe('16-Mar-26');

    const purVoucher = { ...dated, vno: 'PF1', type: 'PF' };
    const pur = buildCaptureSheet([purVoucher], { tab: 'purchase', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(pur.columns.find((c) => c.key === 'saleDate').label).toBe('Purchase Date');
    expect(pur.rows[0].saleDate).toBe('16-Mar-26');
  });

  test('Tally Ref columns sit together (sale then purchase) and carry sourceRef', () => {
    // Sale tab: own sourceRef → saleTallyRef; linked purchase's → purTallyRef.
    const sale = buildCaptureSheet([{ ...saleVoucher, sourceRef: 'IS/01' }], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    const keys = keyset(sale);
    expect(keys.indexOf('purTallyRef')).toBe(keys.indexOf('saleTallyRef') + 1); // refs are adjacent in the trailing block
    expect(sale.columns.find((c) => c.key === 'saleTallyRef').label).toBe('Sales Tally Ref');
    expect(sale.columns.find((c) => c.key === 'purTallyRef').label).toBe('Purchase Tally Ref');
    expect(sale.rows[0].saleTallyRef).toBe('IS/01');           // own voucher
    expect(sale.rows[0].purTallyRef).toBe('IP/01');            // linked purchase

    // Purchase tab: own sourceRef → purTallyRef; linked sale's → saleTallyRef.
    const pur = buildCaptureSheet([{ ...saleVoucher, vno: 'PF1', type: 'PF', sourceRef: 'IP/01' }], { tab: 'purchase', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(pur.rows[0].purTallyRef).toBe('IP/01');             // own voucher
    expect(pur.rows[0].saleTallyRef).toBe('IS/01');            // linked sale
  });

  test('Booking No column is present and carries the booking number', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(keyset(sheet)).toContain('bookingNo');
    expect(sheet.columns.find((c) => c.key === 'bookingNo').label).toBe('Booking No');
    expect(sheet.rows[0].bookingNo).toBe('BKG1');
  });

  test('Invoice column is the LAST column and labelled per side', () => {
    const sale = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    const lastSale = sale.columns[sale.columns.length - 1];
    expect(lastSale.key).toBe('invoice');
    expect(lastSale.label).toBe('Sales Invoice');

    const purVoucher = { ...saleVoucher, vno: 'PF1', type: 'PF' };
    const pur = buildCaptureSheet([purVoucher], { tab: 'purchase', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    const lastPur = pur.columns[pur.columns.length - 1];
    expect(lastPur.key).toBe('invoice');
    expect(lastPur.label).toBe('Purchase Invoice');
    expect(pur.columns.find((c) => c.key === 'salesType').label).toBe('Purchase Type');
  });
});
