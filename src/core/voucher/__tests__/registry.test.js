// Voucher registry — Option A (any-ledger receipt/payment) + edit-display fix.
// Field components are mocked so only the pure toBody/fromVoucher logic loads.
jest.mock('../fields/JournalFields', () => ({ JournalFields: () => null }));
jest.mock('../fields/ReceiptPaymentFields', () => ({ ReceiptPaymentFields: () => null }));
jest.mock('../fields/ContraFields', () => ({ ContraFields: () => null }));
jest.mock('../fields/PurchaseExpenseFields', () => ({ PurchaseExpenseFields: () => null }));
jest.mock('../fields/DebitNoteFields', () => ({ DebitNoteFields: () => null }));
jest.mock('../fields/RefundReissueFields', () => ({ RefundReissueFields: () => null }));
jest.mock('../fields/AdmAcmFields', () => ({ AdmAcmFields: () => null }));

const { VOUCHER_REGISTRY } = require('../registry');
const RC = VOUCHER_REGISTRY.receipt;
const PM = VOUCHER_REGISTRY.payment;
const CV = VOUCHER_REGISTRY.contra;
const ctx = { branchCode: 'BOM' };

describe('refund / reissue / adm / acm — registered & gated payloads', () => {
  test.concurrent('all four categories are registered', async () => {
    ['refund', 'reissue', 'adm', 'acm'].forEach((c) => expect(VOUCHER_REGISTRY[c]).toBeTruthy());
  });

  test.concurrent('refund toBody: customer refund = supplier − our charges − GST', async () => {
    const b = VOUCHER_REGISTRY.refund.toBody({ date: '2026-06-13', againstInvoice: 'SF/1', gstMode: 'intra', party: 'ABC', counterParty: 'Air India', supplierAmt: 48000, serviceCharge: 2000, markup: 500, gstPct: 18, supplierSvc: 0, supplierGst: 0 }, ctx);
    expect(b.category).toBe('refund');
    expect(b.total).toBe(48000 - 2500 - 450); // 45050
    expect(b.lines).toHaveLength(2);
  });

  test.concurrent('reissue toBody: customer bill = supplier + our charges + GST', async () => {
    const b = VOUCHER_REGISTRY.reissue.toBody({ date: '2026-06-13', againstInvoice: 'SF/1', gstMode: 'intra', party: 'ABC', counterParty: 'Air India', supplierAmt: 3000, serviceCharge: 1000, markup: 0, gstPct: 18, supplierSvc: 0, supplierGst: 0 }, ctx);
    expect(b.category).toBe('reissue');
    expect(b.total).toBe(3000 + 1000 + 180);
  });

  test.concurrent('adm toBody: BSP-only, no customer/markup, total = amount + GST', async () => {
    const b = VOUCHER_REGISTRY.adm.toBody({ date: '2026-06-13', counterParty: 'Air India', amount: 1000, gstPct: 18, gstMode: 'intra', reasonCode: 'FD' }, ctx);
    expect(b).toMatchObject({ type: 'ADM', category: 'adm', counterParty: 'Air India', supplierAmt: 1000, taxAmt: 180, total: 1180 });
    expect(b.party).toBeUndefined();   // no customer leg
    expect(b.lines).toBeUndefined();   // no markup/service income lines
  });

  test.concurrent('acm toBody: BSP-only, no customer/markup, total = amount + GST', async () => {
    const b = VOUCHER_REGISTRY.acm.toBody({ date: '2026-06-13', counterParty: 'Air India', amount: 1500, gstPct: 0 }, ctx);
    expect(b).toMatchObject({ type: 'ACM', category: 'acm', supplierAmt: 1500, taxAmt: 0, total: 1500 });
    expect(b.party).toBeUndefined();
  });

  test.concurrent('refund validate requires invoice + both parties + amount', async () => {
    expect(VOUCHER_REGISTRY.refund.validate({ againstInvoice: '', party: '', counterParty: '', supplierAmt: 0 }).ok).toBe(false);
    expect(VOUCHER_REGISTRY.refund.validate({ againstInvoice: 'SF/1', party: 'ABC', counterParty: 'AI', supplierAmt: 100 }).ok).toBe(true);
  });

  test.concurrent('adm validate needs only airline + amount (no customer)', async () => {
    expect(VOUCHER_REGISTRY.adm.validate({ counterParty: '', amount: 100 }).ok).toBe(false);
    expect(VOUCHER_REGISTRY.adm.validate({ counterParty: 'AI', amount: 100 }).ok).toBe(true);
  });
});

describe('debit-note — purchase return registered & gated payload', () => {
  const DN = VOUCHER_REGISTRY['debit-note'];

  test.concurrent('debit-note is registered with type DN', async () => {
    expect(DN).toBeTruthy();
    expect(DN.type).toBe('DN');
  });

  test.concurrent('toBody: supplier party + return lines + GST, total = subtotal + GST', async () => {
    const b = DN.toBody({
      date: '2026-06-19', party: 'Air India', billNo: 'PI/BOM/26/0042',
      gstApplicable: true, gstMode: 'intra', gstPct: 18, gstAmt: 1800,
      lines: [{ ledger: 'Purchase — Air Ticket', amt: 10000, desc: 'cancelled PNR' }],
    }, ctx);
    expect(b).toMatchObject({ type: 'DN', category: 'debit-note', party: 'Air India', partyType: 'supplier' });
    expect(b.subtotal).toBe(10000);
    expect(b.taxAmt).toBe(1800);
    expect(b.total).toBe(11800);               // Dr supplier = Cr purchase + input GST
    expect(b.lines).toHaveLength(1);
    expect(b.againstInvoice).toBe('PI/BOM/26/0042');
  });

  test.concurrent('toBody: GST unticked → no tax, total = subtotal, gstMode cleared', async () => {
    const b = DN.toBody({
      date: '2026-06-19', party: 'Hotel Co', gstApplicable: false, gstMode: 'intra', gstAmt: 999,
      lines: [{ ledger: 'Purchase — Hotel', amt: 5000 }],
    }, ctx);
    expect(b.taxAmt).toBe(0);
    expect(b.total).toBe(5000);
    expect(b.gstMode).toBe('');
  });

  test.concurrent('toBody: zero-amount / blank-ledger lines are dropped', async () => {
    const b = DN.toBody({
      date: '2026-06-19', party: 'Air India', gstApplicable: false,
      lines: [{ ledger: 'Purchase — Air Ticket', amt: 8000 }, { ledger: '', amt: 500 }, { ledger: 'X', amt: 0 }],
    }, ctx);
    expect(b.lines).toHaveLength(1);
    expect(b.total).toBe(8000);
  });

  test.concurrent('validate: needs supplier + at least one priced line', async () => {
    expect(DN.validate({ party: '', lines: [{ ledger: 'Purchase', amt: 1000 }], gstApplicable: false }).ok).toBe(false);
    expect(DN.validate({ party: 'Air India', lines: [], gstApplicable: false }).ok).toBe(false);
    expect(DN.validate({ party: 'Air India', lines: [{ ledger: '', amt: 1000 }], gstApplicable: false }).ok).toBe(false);
    expect(DN.validate({ party: 'Air India', lines: [{ ledger: 'Purchase', amt: 1000 }], gstApplicable: false }).ok).toBe(true);
  });

  test.concurrent('fromVoucher round-trips a saved debit note for the edit form', async () => {
    const b = DN.toBody({
      date: '2026-06-19', party: 'Air India', billNo: 'PI/1',
      gstApplicable: true, gstMode: 'intra', gstPct: 18, gstAmt: 1800,
      lines: [{ ledger: 'Purchase — Air Ticket', amt: 10000, desc: 'rtn' }],
    }, ctx);
    const s = DN.fromVoucher(b);
    expect(s.party).toBe('Air India');
    expect(s.gstApplicable).toBe(true);
    expect(s.gstAmt).toBe(1800);
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].ledger).toBe('Purchase — Air Ticket');
    // re-serialising the recovered state reproduces the same total (idempotent edit)
    expect(DN.toBody(s, ctx).total).toBe(11800);
  });
});

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
