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
    for (const r of ['/hr/employees', '/settings/users', '/group-dashboard', '/finance/receipts', '/dashboards/capital', '/dashboards/branch']) {
      expect(canReachRoute(r, ADMIN)).toBe(true);
      expect(canReachRoute(r, EXEC)).toBe(true);
    }
  });

  test('a Branch Accountant is blocked from out-of-scope admin areas by direct URL', () => {
    for (const r of ['/hr/employees', '/hr/payroll', '/settings/users', '/settings/company', '/group-dashboard', '/tax/gstr1', '/tax/tds']) {
      expect(canReachRoute(r, ACCT)).toBe(false);
    }
  });

  test('a Branch Accountant is blocked from the central Director/Owner dashboard suite by direct URL', () => {
    // /dashboards/* is nav-hidden from accountants; this pins the route-level lockout so a
    // direct URL (e.g. /dashboards/capital) can't open group-wide financials. /dashboard,
    // /dashboard/alerts (singular segment) stay reachable — see the "keeps" test below.
    for (const r of ['/dashboards/capital', '/dashboards/branch', '/dashboards/profitability', '/dashboards/audit', '/dashboards/module-gp', '/dashboards/customer-value']) {
      expect(canReachRoute(r, ACCT)).toBe(false);
    }
  });

  test('an explicit per-page grant overrides the /dashboards/* lockout', () => {
    const granted = { ...ACCT, granted: ['/dashboards/branch'] };
    expect(canReachRoute('/dashboards/branch', granted)).toBe(true);   // the granted page opens
    expect(canReachRoute('/dashboards/capital', granted)).toBe(false); // others stay locked
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

// Regime gate (branch-country): India-GST-only screens are blocked on an Africa VAT branch
// (NBO/DAR/FBM) even for full-menu roles and even by direct URL. India branches / the
// consolidated ALL view are unaffected. The `branch` param is optional/back-compat.
describe('canReachRoute — branch-regime (VAT vs GST) gate', () => {
  const NBO = { code: 'NBO' }, DAR = { code: 'DAR' }, BOM = { code: 'BOM' };
  const INDIA_ONLY = ['/tax/gstr1', '/tax/gstr3b', '/tax/gstr2b', '/tax/tds', '/tax/tds-certs',
    '/tax/form26as', '/tax/rcm', '/tax/einvoice', '/tax/eway', '/tax/audit-3cd', '/tax/gstr-1-prep',
    // India-only statutory tools outside /tax/*: the TDS calculator (Sections 194/PAN/Challan
    // 281) and the PF/ESI challan register are blocked on a VAT branch too. /hr/payroll is NOT
    // (payroll runs on every branch) — asserted separately below.
    '/finance/tds-calculator', '/hr/pf-esi'];
  const SHARED_OR_AFRICA = ['/tax/vat', '/tax/reconciliation', '/tax/calendar',
    '/reports/tax-summary', '/hr/payroll'];

  test('India-GST-only routes are blocked on a VAT branch — even for full-menu roles', () => {
    for (const r of INDIA_ONLY) {
      expect(canReachRoute(r, EXEC, NBO)).toBe(false);
      expect(canReachRoute(r, ADMIN, NBO)).toBe(false);
      expect(canReachRoute(r, DAR && ADMIN, DAR)).toBe(false);
    }
  });

  test('a VAT branch keeps its own VAT + shared tax/report screens', () => {
    for (const r of SHARED_OR_AFRICA) expect(canReachRoute(r, EXEC, NBO)).toBe(true);
  });

  test('India branches and the consolidated ALL view reach India-GST screens', () => {
    for (const r of INDIA_ONLY) {
      expect(canReachRoute(r, EXEC, BOM)).toBe(true);
      expect(canReachRoute(r, ADMIN, 'ALL')).toBe(true);
    }
  });

  test('an explicit per-page grant overrides the regime gate', () => {
    expect(canReachRoute('/tax/tds', EXEC, NBO)).toBe(false);
    expect(canReachRoute('/tax/tds', { ...EXEC, granted: ['/tax/tds'] }, NBO)).toBe(true);
  });

  test('omitting the branch arg is a no-op (prior behaviour preserved)', () => {
    expect(canReachRoute('/tax/gstr1', EXEC)).toBe(true);   // full-menu, no branch → reachable
    expect(canReachRoute('/tax/gstr1', ACCT)).toBe(false);  // accountant still blocked by role
  });
});
