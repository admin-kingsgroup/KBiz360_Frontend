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
  lines: [{ ledger: 'IT-Base Fare', amt: 1000 }],
};
const keyset = (sheet) => sheet.columns.map((c) => c.key);

describe('buildCaptureSheet — register capture columns & row refs', () => {
  test('All modules: a Sales Type column sits immediately before Client Type', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    const keys = keyset(sheet);
    expect(keys).toContain('salesType');
    expect(keys.indexOf('salesType')).toBe(keys.indexOf('clientType') - 1); // directly before
    const typeCol = sheet.columns.find((c) => c.key === 'salesType');
    expect(typeCol.label).toBe('Sales Type');
    expect(sheet.rows[0].salesType).toBe('Tickets'); // productOf(SF)
  });

  test('Single module (showType false): no Sales Type column', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: false });
    expect(keyset(sheet)).not.toContain('salesType');
  });

  test('Final Invoice Value column exists and each row back-references its voucher (for the JV) and booking (for the invoice)', () => {
    const sheet = buildCaptureSheet([saleVoucher], { tab: 'sales', tag: 'BOM', linkIndex, bookingByLink, showType: true });
    expect(keyset(sheet)).toContain('finalValue');
    expect(sheet.rows[0].finalValue).toBe(1180);
    expect(sheet.rows[0]._v).toBe(saleVoucher);
    expect(sheet.rows[0]._booking).toBe(booking);
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
