// The redesigned Director Dashboard (performance/ops view) surfaces a consultant
// leaderboard — team performance — built live from the period's sale vouchers,
// scoped to the branch selector. Lock the new data path into loadDirectorDashboard.
jest.mock('../api', () => ({
  periods: () => ({ month: { from: '', to: '' }, prevMonth: { from: '', to: '' }, ytd: { from: '', to: '' } }),
  rangeToDates: () => ({ from: '', to: '', label: 'M' }),
  getRevenueTrend: jest.fn(async () => []),
  getTopCustomers: jest.fn(async () => []),
  getTopSuppliers: jest.fn(async () => []),
  getBankAccounts: jest.fn(async () => []),
  getModulePL: jest.fn(async () => ({ totals: { sales: 0, gp: 0, gpPct: 20 }, bridge: { netProfit: 0 }, indirect: { expense: 0 } })),
  getAgeingTotals: jest.fn(async () => ({ receivable: 0, payable: 0 })),
  getCashPosition: jest.fn(async () => 0),
  getArAgeingSummary: jest.fn(async () => []),
  getApAgeingSummary: jest.fn(async () => []),
  getBookingSummary: jest.fn(async () => ({ pending: {}, approved: {}, rejected: {}, deleted: {} })),
  getSalesReconciliation: jest.fn(async () => ({ revenue: 0, buckets: [], bucketSum: 0, residual: 0, reconciles: true })),
  getGpReconciliation: jest.fn(async () => ({ gp: 0, buckets: [], bucketSum: 0, residual: 0, reconciles: true })),
  getSaleVouchers: jest.fn(async () => [
    { consultant: 'Alice', subtotal: 1000 },
    { consultant: 'Alice', subtotal: 500 },
    { consultant: 'Bob', subtotal: 800 },
  ]),
}));
import * as api from '../api';
import { loadDirectorDashboard } from '../services/dashboard.service';

describe('loadDirectorDashboard — consultant leaderboard (Director ops view)', () => {
  test('builds topConsultants ranked by revenue, from the period sale vouchers', async () => {
    const d = await loadDirectorDashboard({ branchCode: 'BOM', from: '2026-04-01', to: '2026-06-30' });
    expect(Array.isArray(d.topConsultants)).toBe(true);
    expect(d.topConsultants[0].name).toBe('Alice'); // 1500 > 800
    expect(d.topConsultants.map((c) => c.name)).toEqual(expect.arrayContaining(['Alice', 'Bob']));
  });

  test('passes the selected branch through to the sale-voucher fetch', async () => {
    await loadDirectorDashboard({ branchCode: 'NBO', from: '2026-04-01', to: '2026-06-30' });
    expect(api.getSaleVouchers).toHaveBeenCalledWith(expect.objectContaining({ branchCode: 'NBO' }));
  });
});
