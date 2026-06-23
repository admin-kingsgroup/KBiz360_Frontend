// Regression: a register (Receipt/Payment/Contra/Journal) must NEVER list a
// DELETED voucher. GET /api/vouchers returns every status (no status filter is
// sent), and a deleted voucher is reversed out of the books + kept view-only, so
// it must drop out of the register at once — otherwise it keeps showing with its
// amount summed into the footer total ("deleted voucher still in the ledger").
jest.mock('../api', () => ({ getVouchers: jest.fn(), getTrialBalance: jest.fn() }));

import * as api from '../api';
import { loadVoucherRegister } from '../services/finance.service';

describe('loadVoucherRegister excludes deleted vouchers', () => {
  test('a deleted voucher is dropped; live ones remain', async () => {
    api.getVouchers.mockResolvedValueOnce([
      { id: '1', vno: 'RV/BOM/26/0301', status: 'approved', total: 100 },
      { id: '2', vno: 'RV/BOM/26/0302', status: 'deleted', total: 1.06 },  // reversed out
      { id: '3', vno: 'RV/BOM/26/0311', status: 'deleted', total: 1 },     // reversed out
      { id: '4', vno: 'RV/BOM/26/0303', status: 'pending', total: 50 },
    ]);

    const rows = await loadVoucherRegister({ branch: 'BOM', category: 'receipt' });

    const vnos = rows.map((r) => r.vno);
    expect(vnos).toEqual(['RV/BOM/26/0301', 'RV/BOM/26/0303']); // no deleted vnos
    expect(rows.some((r) => r.status === 'deleted')).toBe(false);
    // deleted amounts must not inflate the register total
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(150);
  });

  test('empty / nullish responses are safe', async () => {
    api.getVouchers.mockResolvedValueOnce(null);
    await expect(loadVoucherRegister({})).resolves.toEqual([]);
  });
});
