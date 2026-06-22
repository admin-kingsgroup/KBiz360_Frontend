// Regression: the Payment Voucher "Paid to" dropdown (and every other ledger
// picker, all sharing LedgerSelect) only listed "some creditor accounts".
// Cause: the menu rendered .slice(0,12) of a registry sorted by account code,
// so the low-coded Sundry Creditors filled all 12 visible slots and expense /
// salary / tax / asset ledgers past index 12 were never shown.
import { pickLedgers, LEDGER_PICKER_CAP } from '../ledgerPick';

// A realistic chart sorted by code: creditors first (low codes), then the rest.
const CREDITORS = Array.from({ length: 20 }, (_, i) => ({
  id: `cr${i}`, name: `Supplier ${i}`, group: 'Sundry Creditors', type: 'Creditor',
}));
const OTHERS = [
  { id: 'exp1', name: 'Salaries & Wages', group: 'Indirect Expenses', type: 'Expense' },
  { id: 'exp2', name: 'Office Rent', group: 'Indirect Expenses', type: 'Expense' },
  { id: 'tax1', name: 'GST Payable', group: 'Duties & Taxes', type: 'Tax' },
  { id: 'ast1', name: 'Furniture & Fixtures', group: 'Fixed Assets', type: 'Asset' },
  { id: 'bank1', name: 'HDFC Current A/c', group: 'Bank Accounts', type: 'Bank' },
  { id: 'cash1', name: 'Cash in Hand', group: 'Cash-in-Hand', type: 'Cash' },
];
const CHART = [...CREDITORS, ...OTHERS];

// The "Paid to" field excludes Bank/Cash (ReceiptPaymentFields).
const notBankCash = (l) => l.type !== 'Bank' && l.type !== 'Cash';

describe('pickLedgers — Payment Voucher "Paid to" dropdown', () => {
  test('surfaces non-creditor ledgers that the old 12-row cap hid', () => {
    const { shown } = pickLedgers(CHART, '', notBankCash);
    const names = shown.map((l) => l.name);
    // Expense / tax / asset ledgers sit past the first dozen creditors — they
    // must now be reachable in the rendered list, not just the creditors.
    expect(names).toContain('Salaries & Wages');
    expect(names).toContain('GST Payable');
    expect(names).toContain('Furniture & Fixtures');
  });

  test('orders the whole list A→Z by name (not by account code)', () => {
    const { matches } = pickLedgers(CHART, '', notBankCash);
    const names = matches.map((l) => l.name);
    const azSorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    expect(names).toEqual(azSorted);
    // Non-creditor heads (which sort early alphabetically) now appear before the
    // bulk of "Supplier N" creditors, instead of being buried after them.
    expect(names.indexOf('Furniture & Fixtures')).toBeLessThan(names.indexOf('Supplier 0'));
    expect(names.indexOf('GST Payable')).toBeLessThan(names.indexOf('Supplier 0'));
  });

  test('numeric-aware A→Z order: "Supplier 2" precedes "Supplier 10"', () => {
    const { matches } = pickLedgers(CHART, 'supplier', notBankCash);
    const names = matches.map((l) => l.name);
    expect(names.indexOf('Supplier 2')).toBeLessThan(names.indexOf('Supplier 10'));
  });

  test('still excludes Bank and Cash accounts', () => {
    const { shown } = pickLedgers(CHART, '', notBankCash);
    expect(shown.some((l) => l.type === 'Bank' || l.type === 'Cash')).toBe(false);
  });

  test('search matches by name and by group, case-insensitively', () => {
    expect(pickLedgers(CHART, 'rent', notBankCash).matches.map((l) => l.name)).toEqual(['Office Rent']);
    expect(pickLedgers(CHART, 'taxes', notBankCash).matches.map((l) => l.name)).toEqual(['GST Payable']); // group match
    expect(pickLedgers(CHART, 'DUTIES', notBankCash).matches.map((l) => l.name)).toEqual(['GST Payable']);
    expect(pickLedgers(CHART, 'zzz-nomatch', notBankCash).matches.length).toBe(0);
    expect(pickLedgers(CHART, 'salaries', notBankCash).matches.map((l) => l.name)).toEqual(['Salaries & Wages']);
  });

  test('renders the entire realistic chart without truncation (cap is a safety bound, not a top-N)', () => {
    // Mirror production: parties hold the low codes, non-party heads sit deep.
    // 110 creditors + 29 debtors push assets/tax/capital well past the old caps.
    const chart = [
      ...Array.from({ length: 110 }, (_, i) => ({ id: `cr${i}`, name: `Supplier ${i}`, group: 'Sundry Creditors', type: 'Creditor' })),
      ...Array.from({ length: 29 }, (_, i) => ({ id: `dr${i}`, name: `Customer ${i}`, group: 'Sundry Debtors', type: 'Debtor' })),
      ...Array.from({ length: 79 }, (_, i) => ({ id: `ex${i}`, name: `Expense ${i}`, group: 'Indirect Expenses', type: 'Expense' })),
      ...Array.from({ length: 54 }, (_, i) => ({ id: `as${i}`, name: `Asset ${i}`, group: 'Fixed Assets', type: 'Asset' })),
      { id: 'tax1', name: 'GST Payable', group: 'Duties & Taxes', type: 'Tax' },
      { id: 'cap1', name: 'Owner Capital', group: 'Capital Account', type: 'Capital' },
    ];
    const { matches, shown } = pickLedgers(chart, '', notBankCash);
    expect(matches.length).toBe(chart.length);
    expect(shown.length).toBe(chart.length); // nothing truncated for a real-sized chart
    const names = shown.map((l) => l.name);
    // Account classes that previously fell past index 50 must now be present.
    expect(names).toContain('Asset 53');   // ~index 192
    expect(names).toContain('GST Payable'); // deepest tax
    expect(names).toContain('Owner Capital'); // very last
  });

  test('only the safety cap bounds an extreme chart', () => {
    const huge = Array.from({ length: LEDGER_PICKER_CAP + 50 }, (_, i) => ({ id: `l${i}`, name: `Ledger ${i}`, group: 'Sundry Creditors', type: 'Creditor' }));
    const { matches, shown } = pickLedgers(huge, '', notBankCash);
    expect(matches.length).toBe(LEDGER_PICKER_CAP + 50);
    expect(shown.length).toBe(LEDGER_PICKER_CAP);
  });

  test('no filter + no query returns the whole chart (capped)', () => {
    const { matches } = pickLedgers(CHART, '', undefined);
    expect(matches.length).toBe(CHART.length);
  });

  test('tolerates an empty / undefined registry', () => {
    expect(pickLedgers(undefined, '', notBankCash)).toEqual({ matches: [], shown: [] });
    expect(pickLedgers([], 'x', notBankCash)).toEqual({ matches: [], shown: [] });
  });
});
