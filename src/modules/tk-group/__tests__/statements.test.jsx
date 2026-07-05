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

  test('without the control the same user keeps the statements (dormant default)', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'BOM' }, { role: 'Branch Accountant' }));
    expect(hrefs).toContain('/reports/pnl');
    expect(hrefs).toContain('/reports/bs');
  });
});
