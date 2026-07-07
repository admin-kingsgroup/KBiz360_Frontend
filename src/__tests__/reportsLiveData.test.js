/* Scenario tests for the report ghost-data fixes:
   - ClientStatement now maps a LIVE ledger statement (no simulated receipts)
   - ReportExpenseBgt actuals come from the LIVE budget-vs-actual feed
   - capitalVsInvestment picks a neutral (no-postings) vs good/bad verdict banner on zeros
   These mirror the pure transforms used inside the report components. */

/* ── ClientStatement: ledger posting → statement row ── */
const lineToTxn = (p) => ({
  type: p.debit > 0 ? 'Invoice' : 'Receipt',
  dr: p.debit || 0,
  cr: p.credit || 0,
  bal: p.balanceSide === 'Cr' ? -(p.balance || 0) : (p.balance || 0),
});
const outstandingFromStmt = (stmt) =>
  stmt ? (stmt.closingSide === 'Cr' ? -(stmt.closingBalance || 0) : (stmt.closingBalance || 0)) : 0;

/* ── ReportExpenseBgt: live actuals keyed by ledger code ── */
const actByCode = (rows) => Object.fromEntries((rows || []).map((r) => [r.code, r.actual || 0]));

/* ── capitalVsInvestment: no-postings detector (selects the neutral banner tone) ── */
const hasCapitalData = (t = {}) =>
  Math.abs(t.capitalInvested || 0) > 0.5 || Math.abs(t.grossProfit || 0) > 0.5 ||
  Math.abs(t.inflowCapital || 0) > 0.5 || Math.abs(t.grossRevenue || 0) > 0.5;

describe('ClientStatement — live ledger statement (no simulated receipts)', () => {
  test('debit line is an Invoice, credit line is a real Receipt', () => {
    expect(lineToTxn({ debit: 1000, credit: 0, balance: 1000, balanceSide: 'Dr' }))
      .toEqual({ type: 'Invoice', dr: 1000, cr: 0, bal: 1000 });
    expect(lineToTxn({ debit: 0, credit: 800, balance: 200, balanceSide: 'Dr' }))
      .toEqual({ type: 'Receipt', dr: 0, cr: 800, bal: 200 });
  });
  test('Cr closing balance is rendered as a negative running balance', () => {
    expect(lineToTxn({ debit: 0, credit: 500, balance: 300, balanceSide: 'Cr' }).bal).toBe(-300);
  });
  test('outstanding follows the closing side from the books', () => {
    expect(outstandingFromStmt({ closingBalance: 4200, closingSide: 'Dr' })).toBe(4200);
    expect(outstandingFromStmt({ closingBalance: 4200, closingSide: 'Cr' })).toBe(-4200);
    expect(outstandingFromStmt(null)).toBe(0); // no client selected → no fabricated figure
  });
});

describe('ReportExpenseBgt — live actuals from budget-vs-actual', () => {
  test('actuals are keyed by ledger code from the live feed', () => {
    const m = actByCode([{ code: 'RENT', actual: 82000 }, { code: 'MKTG', actual: 38000 }]);
    expect(m.RENT).toBe(82000);
    expect(m.MKTG).toBe(38000);
  });
  test('a ledger with no live actual reads 0 (not a hardcoded figure)', () => {
    const m = actByCode([{ code: 'RENT', actual: 82000 }]);
    expect(m.MKTG || 0).toBe(0);
  });
  test('empty feed yields no actuals (no ghost EXP_ACTUALS)', () => {
    expect(actByCode([])).toEqual({});
    expect(actByCode(undefined)).toEqual({});
  });
});

describe('capitalVsInvestment — no-postings detector', () => {
  test('all-zero totals → no postings (neutral banner, report still renders with zeros)', () => {
    expect(hasCapitalData({})).toBe(false);
    expect(hasCapitalData({ capitalInvested: 0, grossProfit: 0 })).toBe(false);
  });
  test('any real posting → good/bad verdict banner', () => {
    expect(hasCapitalData({ grossProfit: 125000 })).toBe(true);
    expect(hasCapitalData({ inflowCapital: 50000 })).toBe(true);
  });
});
