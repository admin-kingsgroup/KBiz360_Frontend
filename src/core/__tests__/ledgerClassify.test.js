// Regression: expense/income heads whose NAME contains "bank"/"cash" (e.g.
// "Bank Charges Expenses", "Cash Discount") were mistyped as Bank/Cash by the
// name-based fallback, so the Payment "Paid to" picker (which excludes Bank/
// Cash) hid them. A real Bank/Cash account is always a balance-sheet head.
import { ledgerType } from '../ledgerClassify';

// The "Paid to" field shows everything except Bank/Cash.
const paidToVisible = (l) => { const t = ledgerType(l); return t !== 'Bank' && t !== 'Cash'; };

describe('ledgerType — bank/cash name false positives', () => {
  test('"Bank Charges Expenses" (expense) is an Expense, not Bank', () => {
    const l = { name: 'Bank Charges Expenses', group: 'Variable Expenses', subGroup: 'Financial Expenses', nature: 'expense', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Expense');
    expect(paidToVisible(l)).toBe(true); // now appears in "Paid to"
  });

  test('a cash-named expense is an Expense, not Cash', () => {
    const l = { name: 'Cash Discount Allowed', group: 'Indirect Expenses', nature: 'expense', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Expense');
    expect(paidToVisible(l)).toBe(true);
  });

  test('a bank-named income head is Income, not Bank', () => {
    const l = { name: 'Bank Interest Received', group: 'Indirect Income', nature: 'income', drCr: 'Cr' };
    expect(ledgerType(l)).toBe('Income');
    expect(paidToVisible(l)).toBe(true);
  });
});

describe('ledgerType — real bank/cash accounts still classify correctly', () => {
  test('a real bank account (group Bank Accounts, asset) stays Bank', () => {
    const l = { name: 'HDFC Bank [A/c. 50200111763261]', group: 'Bank Accounts', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Bank');
    expect(paidToVisible(l)).toBe(false); // excluded from "Paid to" (it's a source)
  });

  test('a Bank OD / credit card (liability) stays Bank', () => {
    const l = { name: 'ICICI Bank Credit Card [4007]', group: 'Bank OD Accounts', nature: 'liability', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Bank');
  });

  test('Cash-in-Hand stays Cash', () => {
    const l = { name: 'Cash in Hand', group: 'Cash-in-Hand', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Cash');
  });

  test('a bank account named without "bank" but grouped Bank Accounts is still Bank', () => {
    const l = { name: 'HDFC [A/c. 50200111763261]', group: 'Bank Accounts', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Bank');
  });
});

describe('ledgerType — party ledgers nested under a custom sub-group (rootGroup)', () => {
  // group is the sub-group (how the BS nests them); rootGroup is the primary.
  test('a customer under "B2C Reference" is still a Debtor (via rootGroup)', () => {
    const l = { name: 'Afshin M. Dhanani', group: 'B2C Reference', rootGroup: 'Sundry Debtors', subGroup: '', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Debtor');
  });
  test('a customer under "B2C Meta" is still a Debtor', () => {
    const l = { name: 'B2C Meta Asif Khan', group: 'B2C Meta', rootGroup: 'Sundry Debtors', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Debtor');
  });
  test('a supplier under "Supplier Air Lines" stays a Creditor (name + rootGroup)', () => {
    const l = { name: 'AIR FRANCE', group: 'Supplier Air Lines', rootGroup: 'Sundry Creditors', nature: 'liability', drCr: 'Cr' };
    expect(ledgerType(l)).toBe('Creditor');
  });
  test('a debtor under "INTER BRANCH" (no debtor token in group) is rescued by rootGroup', () => {
    const l = { name: 'TK-BOM - Car Rental A/c.', group: 'INTER BRANCH', rootGroup: 'Sundry Debtors', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Debtor');
  });
  test('without rootGroup, a non-party asset is unaffected (no false Debtor)', () => {
    const l = { name: 'Prepaid Expenses', group: 'Misc. Expenses (Asset)', nature: 'asset', drCr: 'Dr' };
    expect(ledgerType(l)).toBe('Asset');
  });
});

describe('ledgerType — other classes unaffected', () => {
  const cases = [
    [{ name: 'ABC Travels', group: 'Sundry Creditors', nature: 'liability', drCr: 'Cr' }, 'Creditor'],
    [{ name: 'XYZ Corp', group: 'Sundry Debtors', nature: 'asset', drCr: 'Dr' }, 'Debtor'],
    [{ name: 'GST Payable', group: 'Duties & Taxes', nature: 'liability', drCr: 'Cr' }, 'Tax'],
    [{ name: 'Owner Capital', group: 'Capital Account', nature: 'liability', drCr: 'Cr' }, 'Capital'],
    [{ name: 'Office Rent', group: 'Indirect Expenses', nature: 'expense', drCr: 'Dr' }, 'Expense'],
    [{ name: 'Furniture', group: 'Fixed Assets', nature: 'asset', drCr: 'Dr' }, 'Asset'],
    [{ name: 'Service Income', group: 'Indirect Income', nature: 'income', drCr: 'Cr' }, 'Income'],
    [{ name: 'Provision', group: 'Current Liabilities', nature: 'liability', drCr: 'Cr' }, 'Liability'],
  ];
  test.each(cases)('%o → %s', (l, expected) => expect(ledgerType(l)).toBe(expected));
});
