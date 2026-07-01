// loadDirectorDashboard must surface the sales-reconciliation bridge (Revenue by
// origin: SO/PO/GP + INB − Refund + Other) so the AD Dashboard can foot Revenue.
const RECON = {
  revenue: 31490745,
  buckets: [
    { key: 'sopogp', label: 'SO/PO/GP (forward sales)', sign: '+', amount: 22151862, count: 385 },
    { key: 'inb',    label: 'INB inter-branch',         sign: '+', amount: 11519458, count: 274 },
    { key: 'refund', label: 'Refund / Reissue',         sign: '-', amount: -2181143, count: 42 },
    { key: 'other',  label: 'Other / Manual',           sign: '+', amount: 0, count: 0 },
  ],
  bucketSum: 31490177, residual: 568, reconciles: false,
};

jest.mock('../api', () => ({
  rangeToDates: () => ({ from: '', to: '', label: 'All' }),
  getRevenueTrend: jest.fn(async () => []),
  getTopCustomers: jest.fn(async () => []),
  getTopSuppliers: jest.fn(async () => []),
  getBankAccounts: jest.fn(async () => []),
  getModulePL: jest.fn(async () => ({ totals: { sales: 31490745, gp: 0, gpPct: 5 }, bridge: { netProfit: 0 }, indirect: { expense: 0 } })),
  getAgeingTotals: jest.fn(async () => ({ receivable: 0, payable: 0 })),
  getCashPosition: jest.fn(async () => 0),
  getArAgeingSummary: jest.fn(async () => []),
  getApAgeingSummary: jest.fn(async () => []),
  getBookingSummary: jest.fn(async () => ({ pending: {}, approved: {}, rejected: {}, deleted: {} })),
  getSalesReconciliation: jest.fn(async () => RECON),
  getSaleVouchers: jest.fn(async () => []),
}));
import * as api from '../api';
import { loadDirectorDashboard } from '../services/dashboard.service';

describe('loadDirectorDashboard — sales reconciliation bridge', () => {
  test('exposes data.salesRecon with the four origin buckets, scoped to the branch/period', async () => {
    const d = await loadDirectorDashboard({ branchCode: 'BOM', from: '2026-04-01', to: '2026-06-30' });
    expect(d.salesRecon).toBeTruthy();
    expect(d.salesRecon.revenue).toBe(31490745);
    expect(d.salesRecon.buckets.map((b) => b.key)).toEqual(['sopogp', 'inb', 'refund', 'other']);
    expect(api.getSalesReconciliation).toHaveBeenCalledWith(expect.objectContaining({ branchCode: 'BOM', from: '2026-04-01', to: '2026-06-30' }));
  });

  test('carries the reconciles flag / residual through so the card can flag drift', async () => {
    const d = await loadDirectorDashboard({ branchCode: 'BOM' });
    expect(d.salesRecon.reconciles).toBe(false);
    expect(d.salesRecon.residual).toBe(568);
  });
});
