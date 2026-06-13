// Voucher registry — Option A (any-ledger receipt/payment) + edit-display fix.
// Field components are mocked so only the pure toBody/fromVoucher logic loads.
jest.mock('../fields/JournalFields', () => ({ JournalFields: () => null }));
jest.mock('../fields/ReceiptPaymentFields', () => ({ ReceiptPaymentFields: () => null }));
jest.mock('../fields/ContraFields', () => ({ ContraFields: () => null }));
jest.mock('../fields/PurchaseExpenseFields', () => ({ PurchaseExpenseFields: () => null }));
jest.mock('../fields/NoteFields', () => ({ NoteFields: () => null }));

const { VOUCHER_REGISTRY } = require('../registry');
const RC = VOUCHER_REGISTRY.receipt;
const PM = VOUCHER_REGISTRY.payment;
const CV = VOUCHER_REGISTRY.contra;
const ctx = { branchCode: 'BOM' };

describe('fromVoucher — edit-display recovery from explicit lines', () => {
  test.concurrent('receipt recovers party/bank/amount when fields are blank', async () => {
    const s = RC.fromVoucher({ party: '', bankRef: '', total: 782932, subtotal: 0, lines: [{ ledger: 'ICICI Bank', drCr: 'Dr', amt: 782932 }, { ledger: 'NeuIQ', drCr: 'Cr', amt: 782932 }] });
    expect(s.party).toBe('NeuIQ');
    expect(s.bankRef).toBe('ICICI Bank');
    expect(s.amount).toBe(782932);
    expect(s.otherType).toBe(''); // imported → unknown until chart loads
  });
  test.concurrent('payment recovers expense + bank', async () => {
    const s = PM.fromVoucher({ party: '', bankRef: '', total: 343, subtotal: 0, lines: [{ ledger: 'Blinkit', drCr: 'Dr', amt: 343 }, { ledger: 'Petty Cash', drCr: 'Cr', amt: 343 }] });
    expect(s.party).toBe('Blinkit');
    expect(s.bankRef).toBe('Petty Cash');
  });
  test.concurrent('contra recovers both legs', async () => {
    const s = CV.fromVoucher({ bankRef: '', total: 50000, lines: [{ ledger: 'YES Bank', drCr: 'Dr', amt: 50000 }, { ledger: 'ICICI Bank', drCr: 'Cr', amt: 50000 }] });
    expect(s.drLedger).toBe('YES Bank');
    expect(s.crLedger).toBe('ICICI Bank');
  });
  test.concurrent('real party receipt preserved + flagged Debtor', async () => {
    const s = RC.fromVoucher({ party: 'Global Konnection', partyType: 'customer', bankRef: 'HDFC', subtotal: 5000, total: 5000 });
    expect(s.party).toBe('Global Konnection');
    expect(s.otherType).toBe('Debtor');
  });
});

describe('toBody — Option A party vs non-party branch', () => {
  test.concurrent('expense payment → explicit Dr expense / Cr bank, blank party', async () => {
    const b = PM.toBody({ party: 'Office Rent', otherType: 'Expense', bankRef: 'ICICI', amount: 50000, alloc: {} }, ctx);
    expect(b.party).toBe('');
    expect(b.lines).toHaveLength(2);
    expect(b.lines[0]).toMatchObject({ ledger: 'Office Rent', drCr: 'Dr', amt: 50000 });
    expect(b.lines[1]).toMatchObject({ ledger: 'ICICI', drCr: 'Cr', amt: 50000 });
    expect(b.total).toBe(50000);
  });
  test.concurrent('loan receipt → Dr bank / Cr account', async () => {
    const b = RC.toBody({ party: 'AD Loan', otherType: 'Loan', bankRef: 'ICICI', amount: 300000, alloc: {} }, ctx);
    expect(b.lines[0]).toMatchObject({ ledger: 'ICICI', drCr: 'Dr' });
    expect(b.lines[1]).toMatchObject({ ledger: 'AD Loan', drCr: 'Cr' });
  });
  test.concurrent('supplier payment → party model (no lines)', async () => {
    const b = PM.toBody({ party: 'TRIP JACK', otherType: 'Creditor', bankRef: 'ICICI', amount: 9300, alloc: {}, applyMode: 'onaccount', parkOnAcc: true }, ctx);
    expect(b.lines).toBeUndefined();
    expect(b.party).toBe('TRIP JACK');
    expect(b.partyType).toBe('supplier');
  });
  test.concurrent('customer receipt → party model (no lines)', async () => {
    const b = RC.toBody({ party: 'NeuIQ', otherType: 'Debtor', bankRef: 'ICICI', amount: 5000, alloc: {}, applyMode: 'onaccount', parkOnAcc: true }, ctx);
    expect(b.lines).toBeUndefined();
    expect(b.partyType).toBe('customer');
  });
});

describe('validate — Option A branches', () => {
  test.concurrent('expense payment with bank + amount is valid', async () => {
    expect(PM.validate({ party: 'Office Rent', otherType: 'Expense', bankRef: 'ICICI', amount: 50000 }).ok).toBe(true);
  });
  test.concurrent('missing bank is invalid', async () => {
    expect(PM.validate({ party: 'Office Rent', otherType: 'Expense', bankRef: '', amount: 50000 }).ok).toBe(false);
  });
  test.concurrent('zero amount is invalid', async () => {
    expect(PM.validate({ party: 'Office Rent', otherType: 'Expense', bankRef: 'ICICI', amount: 0 }).ok).toBe(false);
  });
});
