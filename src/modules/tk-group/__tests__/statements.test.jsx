import { gateStatements, isStatementHref } from '../utils/statements';
import { getVisibleMenu } from '../menu';

const hrefsOf = (nodes, out = []) => {
  (nodes || []).forEach((n) => {
    if (!n || n.divider) return;
    if (n.href) out.push(n.href);
    if (n.children) hrefsOf(n.children, out);
  });
  return out;
};

describe('gateStatements (pure)', () => {
  const menu = [
    { label: 'Branch MIS', children: [
      { label: 'Profit & Loss', href: '/reports/pnl' },
      { label: 'Balance Sheet', href: '/reports/bs' },
      { label: 'Cash Position', href: '/reports/cash-position' }, // not a statement — kept
    ] },
    { label: 'Books', children: [{ label: 'Ledger', href: '/ledger' }] },
  ];

  test('isStatementHref knows P&L / Balance Sheet', () => {
    expect(isStatementHref('/reports/pnl')).toBe(true);
    expect(isStatementHref('/reports/bs')).toBe(true);
    expect(isStatementHref('/ledger')).toBe(false);
  });

  test('hide=false (dormant) returns the tree unchanged', () => {
    expect(gateStatements(menu, false)).toBe(menu);
  });

  test('hide=true removes P&L + Balance Sheet, keeps everything else', () => {
    const got = hrefsOf(gateStatements(menu, true));
    expect(got).not.toContain('/reports/pnl');
    expect(got).not.toContain('/reports/bs');
    expect(got).toContain('/reports/cash-position');
    expect(got).toContain('/ledger');
  });
});

describe('getVisibleMenu — hide-statements integration', () => {
  test('a restricted user (hideStatements) loses P&L + Balance Sheet from nav', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'BOM' }, { role: 'Branch Accountant', hideStatements: true }));
    expect(hrefs).not.toContain('/reports/pnl');
    expect(hrefs).not.toContain('/reports/bs');
    // registers / ledgers / reconciliation remain
    expect(hrefs).toContain('/reports/sreg');
    expect(hrefs).toContain('/ledger');
  });

  test('the statements are off the accountant menu even without the control', () => {
    // 2026-07-17: the whole Branch MIS head (P&L / BS / Cash Position) left the
    // accountant Accounts pill (MENU_ACCOUNTS_BRANCH_ACCOUNTANT), so the statements
    // are gone at ROLE level — the hideStatements control is now a no-op for this
    // role (it still guards full-menu roles a Director restricts).
    const hrefs = hrefsOf(getVisibleMenu({ code: 'BOM' }, { role: 'Branch Accountant' }));
    expect(hrefs).not.toContain('/reports/pnl');
    expect(hrefs).not.toContain('/reports/bs');
    // the rest of the workspace is untouched
    expect(hrefs).toContain('/reports/sreg');
    expect(hrefs).toContain('/ledger');
  });
});
