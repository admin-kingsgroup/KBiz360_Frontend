// Cash Book — "Ledger Name" (contra ledger) + narration derivation.
// Pure helpers shared by CashBookLive; the screen shows the ledger name as the
// main Particulars and reveals the narration under it only on "Expand all".
import { contraLedgerName, lineNarration } from '../core/cashBookRows';

// A cash receipt: Cash-in-Hand (this ledger) Dr, Sales (contra) Cr.
const receipt = {
  date: '01-04-2025', vno: 'RV-1', debit: 5000, credit: 0,
  narration: 'Counter sale — walk-in',
  particulars: [{ ledger: 'Sales', group: 'Direct Income', side: 'Cr', amount: 5000 }],
};
// A payment split across two contra legs.
const payment = {
  date: '02-04-2025', vno: 'PV-1', debit: 0, credit: 1200,
  entryNarration: 'Office expenses',
  particulars: [
    { ledger: 'Rent', group: 'Indirect Exp', side: 'Dr', amount: 1000 },
    { ledger: 'Electricity', group: 'Indirect Exp', side: 'Dr', amount: 200 },
  ],
};

describe('contraLedgerName — Cash Book "Ledger Name" column', () => {
  test('single contra leg → that ledger name', () => {
    expect(contraLedgerName(receipt)).toBe('Sales');
  });

  test('multiple distinct legs → "First (+N more)"', () => {
    expect(contraLedgerName(payment)).toBe('Rent (+1 more)');
  });

  test('duplicate contra ledgers collapse before counting', () => {
    const ln = { particulars: [{ ledger: 'Rent' }, { ledger: 'Rent' }] };
    expect(contraLedgerName(ln)).toBe('Rent'); // not "Rent (+1 more)"
  });

  test('no contra leg → falls back to party, then category, then em-dash', () => {
    expect(contraLedgerName({ particulars: [], party: 'ACME' })).toBe('ACME');
    expect(contraLedgerName({ category: 'Receipt' })).toBe('Receipt');
    expect(contraLedgerName({})).toBe('—');
    expect(contraLedgerName(null)).toBe('—');
  });
});

describe('lineNarration — text shown under the ledger name on Expand all', () => {
  test('prefers posting narration', () => {
    expect(lineNarration(receipt)).toBe('Counter sale — walk-in');
  });

  test('falls back to voucher narration', () => {
    expect(lineNarration(payment)).toBe('Office expenses');
  });

  test('blank when neither present (nothing renders under the ledger name)', () => {
    expect(lineNarration({ vno: 'X' })).toBe('');
    expect(lineNarration(null)).toBe('');
  });
});
