/* Verifies the reorganized Accounts pill: a workflow-ordered set of groups, with
   the formerly-flat 13-item "Daily Entry" block now segmented by voucher family —
   without losing or duplicating any route. */
import { MENU_ACCOUNTS } from '../core/menus';

const groupByLabel = (label) => MENU_ACCOUNTS.children.find((c) => c.label === label);
const leafHrefs = (node, out = []) => {
  if (!node || node.divider) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => leafHrefs(c, out));
  return out;
};

describe('Accounts pill — reorganized layout', () => {
  test('top-level groups follow the entry → registers → outstanding → reporting → close order', () => {
    const labels = MENU_ACCOUNTS.children.map((c) => c.label);
    expect(labels).toEqual([
      'Dashboard Accountant',
      'Daily Entry',
      'Sales & Purchase',
      'Refunds & Returns',
      'BSP & Airline',
      'Receivables & Clients',
      'Payables & Suppliers',
      'Cash & Bank',
      'Reconciliation',
      'Books & Scrutiny',
      'Branch MIS',
      'Inter Branch',
      'Period Close',
      'Accounts Master',
    ]);
  });

  test('Daily Entry is segmented into labelled voucher families', () => {
    const de = groupByLabel('Daily Entry');
    const dividers = de.children.filter((c) => c.divider).map((c) => c.label);
    expect(dividers).toEqual([
      'Sales & Inter-Branch',
      'Receipts, Payments & Contra',
      'Journal & Expense',
      'Refunds, Reissue & Memos',
    ]);
  });

  test('all 13 voucher routes survive the segmentation, none duplicated', () => {
    const VOUCHERS = [
      '/bookings/new', '/bookings/inter-branch', '/receipts', '/payments', '/contra',
      '/journal', '/purchase-expense', '/debit-note', '/finance/refund',
      '/finance/refund-partial', '/finance/reissue', '/finance/adm-voucher', '/finance/acm-voucher',
    ];
    const got = leafHrefs(groupByLabel('Daily Entry'));
    expect(got.sort()).toEqual([...VOUCHERS].sort());
  });

  test('no duplicate route anywhere in the Accounts pill', () => {
    const all = leafHrefs(MENU_ACCOUNTS);
    const dupes = all.filter((h, i) => all.indexOf(h) !== i);
    expect(dupes).toEqual([]);
  });
});
