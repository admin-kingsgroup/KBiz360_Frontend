/* Guards that the three adjustment registers (Refund / Reissue / Debit Note) are
   wired into the finance route table the host router mounts. financeRoutes is
   plain data with React.lazy Elements, so importing it does NOT pull in the heavy
   voucher-register page tree (pnlTally -> api/styles use import.meta, unparseable
   under jest) — keeping this a fast, dependency-free wiring check. The matching
   category -> route map is guarded separately in __tests__/statistics.test.jsx. */
import { financeRoutes } from '../routes';

const byPath = (p) => financeRoutes.find((r) => r.path === p);

describe('finance adjustment registers — route wiring', () => {
  test.each([
    ['/finance/refund-register', 'Refund Register'],
    ['/finance/reissue-register', 'Reissue Register'],
    ['/finance/debit-note-register', 'Debit Note Register'],
    ['/finance/purchase-expense-register', 'Purchase Expense Register (PXP)'],
  ])('%s is mounted with the right title + a lazy Element', (path, title) => {
    const route = byPath(path);
    expect(route).toBeDefined();
    expect(route.title).toBe(title);
    expect(route.moduleName).toBe('Finance');
    expect(route.Element).toBeTruthy(); // React.lazy() exotic component
  });

  test('does not collide with the existing voucher registers', () => {
    for (const p of ['/finance/receipt-register', '/finance/payment-register',
      '/finance/contra-register', '/finance/journal-register']) {
      expect(byPath(p)).toBeDefined();
    }
    const paths = financeRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length); // no duplicate paths
  });
});
