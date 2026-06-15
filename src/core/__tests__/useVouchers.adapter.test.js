// Re-point contract: the live Sales / Purchase registers (the purchase-linking
// picker on sale entry, and the BSP settlement report) now read the ERP's OWN
// vouchers (GET /api/vouchers) instead of the removed CRM bridge. These tests
// lock the adapter shape so disconnecting CRM never silently drops a field those
// screens depend on (vno / supplier / ref / desc / amt / date / settled, and
// saleAmt on the sale side).
//
// api.js uses import.meta.env (no babel plugin for it under Jest), so mock the
// module — the adapters under test are pure and never call it.
jest.mock('../api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => 'open') }));

import { toSaleRow, toPurchaseRow } from '../useVouchers';

describe('voucher register adapters (ERP vouchers → register rows)', () => {
  test('toPurchaseRow maps an ERP purchase voucher to a purchase-registry row', () => {
    const v = {
      vno: 'PF/BOM/26/0001', branch: 'BOM', date: '2026-06-01',
      party: 'Air India Creditor', billTo: 'Air India',
      againstInvoice: 'BILL-77', linkNo: 'LK/BOM/12', remarks: 'Being ticket purchase',
      total: 50000, type: 'PF',
    };
    expect(toPurchaseRow(v, 'PF')).toMatchObject({
      vno: 'PF/BOM/26/0001', branch: 'BOM', date: '2026-06-01',
      supplier: 'Air India', ref: 'BILL-77', desc: 'Being ticket purchase',
      amt: 50000, settled: false, module: 'PF',
    });
  });

  test('toPurchaseRow prefers billTo over party and falls back to linkNo for ref', () => {
    const row = toPurchaseRow({ party: 'Ledger Name', billTo: 'Display Name', linkNo: 'LK1', total: 10 }, 'PH');
    expect(row.supplier).toBe('Display Name'); // billTo wins
    expect(row.ref).toBe('LK1');               // no againstInvoice → linkNo
    expect(row.amt).toBe(10);
  });

  test('toSaleRow maps an ERP sale voucher to a sales-ticket row', () => {
    const v = {
      vno: 'SF/BOM/26/0001', branch: 'BOM', date: '2026-06-02',
      party: 'Walk-in Debtor', billTo: 'John Doe',
      costCenter: 'BOM-FLT-INT', linkNo: 'LK/BOM/12', total: 60000,
    };
    expect(toSaleRow(v)).toMatchObject({
      vno: 'SF/BOM/26/0001', branch: 'BOM', date: '2026-06-02',
      customer: 'John Doe', saleAmt: 60000, costCenter: 'BOM-FLT-INT', linkNo: 'LK/BOM/12',
    });
  });

  test('amount fields coerce missing/garbage totals to 0 (no NaN into GP math)', () => {
    expect(toPurchaseRow({}, 'PF').amt).toBe(0);
    expect(toSaleRow({}).saleAmt).toBe(0);
    expect(toPurchaseRow({ total: 'abc' }, 'PF').amt).toBe(0);
  });
});
