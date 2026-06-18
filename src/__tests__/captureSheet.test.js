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

import { buildCaptureSheet } from '../modules/accountingLive.jsx';

const linkIndex = { saleByLink: { LK1: 'SF1' }, purByLink: { LK1: 'PF1' } };
const booking = { linkNo: 'LK1', bookingNo: 'BKG1', so: { total: 1000 }, customer: { name: 'ACME' } };
const bookingByLink = { LK1: booking };

const saleVoucher = {
  vno: 'SF1', type: 'SF', branch: 'BOM', linkNo: 'LK1', gstMode: 'intra',
  total: 1180, taxAmt: 180, partyGroup: 'B2B', party: 'ACME',
  lines: [{ ledger: 'IT-Base Fare', amt: 1000 }], // IT- prefix → International
};
const keyset = (sheet) => sheet.columns.map((c) => c.key);

describe('buildCaptureSheet — register capture columns & row refs', () => {
  test('All modules: Sales Type then INT/DOM sit (in order) before Client Type', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    const keys = keyset(sheet);
    expect(keys).toContain('salesType');
    expect(keys).toContain('intDom');
    // order: salesType → intDom → clientType
    expect(keys.indexOf('salesType')).toBe(keys.indexOf('intDom') - 1);
    expect(keys.indexOf('intDom')).toBe(keys.indexOf('clientType') - 1);
    expect(sheet.columns.find((c) => c.key === 'salesType').label).toBe('Sales Type');
    expect(sheet.columns.find((c) => c.key === 'intDom').label).toBe('INT / DOM');
    expect(sheet.rows[0].salesType).toBe('Flight'); // productOf(SF)
    expect(sheet.rows[0].intDom).toBe('INT');         // IT- ledger prefix
  });

  test('INT/DOM follows the booking packageType when present (Domestic)', () => {
    const dom = { ...booking, packageType: 'Domestic' };
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink: { LK1: dom }, showType: true });
    expect(sheet.rows[0].intDom).toBe('DOM');
  });

  test('Single module (showType false): no Sales Type / INT-DOM columns', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: false });
    expect(keyset(sheet)).not.toContain('salesType');
    expect(keyset(sheet)).not.toContain('intDom');
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
