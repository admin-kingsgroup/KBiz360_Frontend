// Hard route-level lockout (core/menus.js canReachRoute) used by App.jsx to block
// out-of-scope areas for restricted roles even via direct URL. Full-menu roles reach
// everything; a Branch Accountant is blocked from HR / Settings / Group dashboard /
// Taxation but keeps all accounting/finance/reports/masters routes.
import { canReachRoute } from '../menus';

const ADMIN = { role: 'Super Admin', email: 'afshin.dhanani@kingsgroupco.com' };
const EXEC = { role: 'Accounts Executive' };        // full-menu (not an accountant)
const ACCT = { role: 'Branch Accountant', email: 'accounts.bom@travkings.com' };

describe('canReachRoute — hard route-level lockout', () => {
  test('full-menu roles reach everything, including the locked areas', () => {
    for (const r of ['/hr/employees', '/settings/users', '/group-dashboard', '/finance/receipts']) {
      expect(canReachRoute(r, ADMIN)).toBe(true);
      expect(canReachRoute(r, EXEC)).toBe(true);
    }
  });

  test('a Branch Accountant is blocked from out-of-scope admin areas by direct URL', () => {
    for (const r of ['/hr/employees', '/hr/payroll', '/settings/users', '/settings/company', '/group-dashboard', '/tax/gstr1', '/tax/tds']) {
      expect(canReachRoute(r, ACCT)).toBe(false);
    }
  });

  test('a Branch Accountant keeps every accounting route (no false lockouts)', () => {
    for (const r of [
      '/dashboard', '/finance/receipts', '/finance/payments', '/reports/pnl', '/reports/yoy',
      '/accounts/dashboard', '/masters/customers', '/sales/flight', '/purchase/flight',
      '/trial-balance', '/approvals/finance', '/transactions/voucher-tabs', '/journal', '/ledger',
    ]) {
      expect(canReachRoute(r, ACCT)).toBe(true);
    }
  });
});
