import { getMenu, MENU_MASTERS, MENU_REPORTS, MENU_HR, MENU_ACCOUNTS } from '../menus';

function leafHrefs(node, out = []) {
  if (!node || node.divider) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => leafHrefs(c, out));
  return out;
}
const hrefsOf = (pills) => pills.flatMap((p) => leafHrefs(p));

// Intentional, documented duplications that remain by design:
//  • Accounts ▸ Reconciliation ▸ Tax links are POINTERS into the Taxation pill.
//  • /tax/tds is dual-labelled inside the Taxation pill itself ("TDS/TCS Register"
//    and "Withholding Tax") — one screen, two regime-specific entry labels.
const ALLOWED_DUP = new Set(['/tax/reconciliation', '/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c', '/tax/tds']);

describe('header has no duplicate routes after the restructure', () => {
  for (const role of ['Super Admin', 'Branch Accountant']) {
    it(`${role}: every route resolves to exactly one pill (except tax pointers)`, () => {
      const menu = getMenu('ALL', { role });
      const counts = {};
      for (const h of hrefsOf(menu)) counts[h] = (counts[h] || 0) + 1;
      const dupes = Object.entries(counts).filter(([h, n]) => n > 1 && !ALLOWED_DUP.has(h)).map(([h]) => h);
      expect(dupes).toEqual([]);
    });
  }
});

describe('HR is its own top-level pill with masters + reports', () => {
  it('MENU_HR is labelled "HR" and appears in the assembled menu', () => {
    expect(MENU_HR.label).toBe('HR');
    const labels = getMenu('ALL', { role: 'Super Admin' }).map((p) => p.label);
    expect(labels).toContain('HR');
  });
  it('HR pill contains the employee masters AND the HR reports', () => {
    const hr = new Set(leafHrefs(MENU_HR));
    ['/hr/employees', '/hr/employee-tabs'].forEach((h) => expect(hr.has(h)).toBe(true));
    ['/hr/leave-utilization', '/hr/attrition', '/hr/calendar'].forEach((h) => expect(hr.has(h)).toBe(true));
  });
  it('employee masters were removed from the Masters pill', () => {
    const masters = new Set(leafHrefs(MENU_MASTERS));
    expect(masters.has('/hr/employees')).toBe(false);
    expect(masters.has('/hr/employee-tabs')).toBe(false);
  });
});

describe('VAT-branch nav prunes India-only statutory leaves (no dead-end links)', () => {
  it('a VAT branch drops /hr/pf-esi & /finance/tds-calculator but KEEPS /tax/tds (WHT fork) + /hr/payroll', () => {
    const hrefs = new Set(hrefsOf(getMenu({ code: 'NBO' }, { role: 'Super Admin' })));
    expect(hrefs.has('/hr/pf-esi')).toBe(false);          // India PF/ESI — gated + pruned
    expect(hrefs.has('/finance/tds-calculator')).toBe(false);
    expect(hrefs.has('/tax/tds')).toBe(true);             // Africa "Withholding Tax" → WHT register
    expect(hrefs.has('/hr/payroll')).toBe(true);          // payroll runs on every branch
    expect(hrefs.has('/tax/vat')).toBe(true);
  });
  it('an India branch keeps the India statutory leaves', () => {
    const hrefs = new Set(hrefsOf(getMenu({ code: 'BOM' }, { role: 'Super Admin' })));
    expect(hrefs.has('/hr/pf-esi')).toBe(true);
    expect(hrefs.has('/hr/payroll')).toBe(true);
  });
});

describe('account reports live under Accounts, not Reports', () => {
  const accounts = new Set(leafHrefs(MENU_ACCOUNTS));
  const reports = new Set(leafHrefs(MENU_REPORTS));
  const ACCOUNT_REPORTS = ['/reports/pnl', '/reports/bs', '/reports/cash-position', '/reports/audit-trail',
    '/reports/sreg', '/reports/preg', '/reports/rec', '/reports/pay', '/reports/client-statement'];

  it('they are present in Accounts', () => {
    ACCOUNT_REPORTS.forEach((h) => expect(accounts.has(h)).toBe(true));
  });
  it('they are absent from Reports', () => {
    ACCOUNT_REPORTS.forEach((h) => expect(reports.has(h)).toBe(false));
  });
});
