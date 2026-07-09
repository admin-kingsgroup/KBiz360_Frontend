// Regression: money on USD branches (NBO/DAR/FBM) must use Western thousands
// grouping, never Indian lakh/crore. The bug class was a hardcoded
// `toLocaleString('en-IN')` on amounts that already pulled a branch currency —
// so an FBM ($) report rendered `$1,23,456` instead of `$123,456`.
//
// Two layers:
//   1. unit — the shared `localeOf` resolver groups by currency, as the screens rely on.
//   2. guard — the screens that were fixed must not reintroduce a hardcoded
//      `toLocaleString('en-IN')` money call (date formatters pass a 2nd arg, so
//      they read as `toLocaleString('en-IN', {…})` and are intentionally exempt).
import fs from 'fs';
import path from 'path';
import { localeOf, setActiveCurrency, activeCurrency, fmt, fmtINR, money } from '../format';

describe('localeOf — grouping follows the currency', () => {
  test('₹ → Indian lakh/crore grouping', () => {
    expect(localeOf('₹')).toBe('en-IN');
    expect((123456).toLocaleString(localeOf('₹'))).toBe('1,23,456');
  });

  test('$ (USD branches) → Western thousands grouping', () => {
    expect(localeOf('$')).toBe('en-US');
    expect((123456).toLocaleString(localeOf('$'))).toBe('123,456');
  });
});

describe('active branch currency — fmt/fmtINR/money default follows the operating branch', () => {
  afterEach(() => setActiveCurrency('₹')); // reset to the default after each

  test('default is ₹ + Indian scale — byte-identical to before any branch is set', () => {
    expect(activeCurrency()).toBe('₹');
    expect(money(50000)).toBe('₹50,000');
    expect(fmtINR(150000)).toBe('₹1.50L');
    expect(fmt(150000)).toBe('1.50 L');
  });

  test('a USD branch → $ + Western K/M/B + thousands grouping (no lakh/crore)', () => {
    setActiveCurrency('$');
    expect(activeCurrency()).toBe('$');
    expect(money(50000)).toBe('$50,000');
    expect(money(123456)).toBe('$123,456');   // NOT $1,23,456
    expect(fmtINR(1500000)).toBe('$1.50M');    // NOT ₹15.00L
    expect(fmt(1500000)).toBe('1.50 M');
  });

  test('an explicit currency always wins over the active default', () => {
    setActiveCurrency('$');
    expect(money(50000, '₹')).toBe('₹50,000');
  });

  test('blank / falsy resets to ₹', () => {
    setActiveCurrency('');
    expect(activeCurrency()).toBe('₹');
  });
});

describe('guard — fixed screens stay branch-currency aware', () => {
  const FROM = path.join(__dirname, '..', '..');
  const SCREENS = [
    'modules/reports/pages/cash-flow-statement.jsx',
    'modules/reports/pages/commission-income.jsx',
    'modules/reports/pages/client-statement.jsx',
    'modules/reports/pages/client-concentration.jsx',
    'modules/reports/pages/expense-budget.jsx',
    'modules/reports/pages/forex.jsx',
    'modules/reports/pages/consultant-productivity.jsx',
    'modules/reports/pages/destination-intelligence.jsx',
    'modules/masters/pages/customer-360.jsx',
    'modules/masters/pages/supplier-360.jsx',
    'modules/masters/pages/sub-agents.jsx',
    'modules/interbranch/interBranchVoucher.jsx',
    'modules/approvals/voucherApprovals.jsx',
    'modules/masters/mastersParties.jsx',
    'modules/reportsFinancial/notesEngine.js',
    'modules/reconciliation/utils.js',
    'core/voucher/VoucherShell.jsx',
    'core/voucher/fields/RefundReissueFields.jsx',
    'core/AuditTrail.jsx',
  ];

  // A money formatter with the locale hardcoded to Indian grouping (no 2nd arg).
  const HARDCODED_MONEY = /toLocaleString\('en-IN'\)/;

  test.each(SCREENS)('%s has no hardcoded en-IN money formatter', (rel) => {
    const src = fs.readFileSync(path.join(FROM, rel), 'utf8');
    expect(src).not.toMatch(HARDCODED_MONEY);
  });
});
