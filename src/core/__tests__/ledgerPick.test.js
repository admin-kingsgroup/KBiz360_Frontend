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

  test('the old cap of 12 would have shown ONLY creditors (proves the bug)', () => {
    const { matches } = pickLedgers(CHART, '', notBankCash);
    const oldVisible = matches.slice(0, 12);
    expect(oldVisible.every((l) => l.type === 'Creditor')).toBe(true);
    expect(oldVisible.map((l) => l.name)).not.toContain('Salaries & Wages');
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

  test('caps the rendered slice but keeps the full match count for the footer hint', () => {
    const many = Array.from({ length: 75 }, (_, i) => ({ id: `l${i}`, name: `Ledger ${i}`, group: 'Sundry Creditors', type: 'Creditor' }));
    const { matches, shown } = pickLedgers(many, '', notBankCash);
    expect(matches.length).toBe(75);
    expect(shown.length).toBe(LEDGER_PICKER_CAP);
    expect(shown.length).toBeGreaterThan(12); // strictly better than the old cap
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
