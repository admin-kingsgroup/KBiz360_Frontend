// Inter-Branch Elimination · the model must reconcile PER book currency and never blend ₹ + $.
// A same-currency mirror pair auto-eliminates; a ₹ ⇄ $ pair is flagged Cross-Currency (it can't
// be netted from closing balances — it settles at the deal's own frozen FX rate).
import { buildElimModel } from '../interbranchElimModel';

// Stub the branch→symbol map (mirrors bc({code}).cur): Africa branches $, India ₹.
const curOf = (code) => (['NBO', 'DAR', 'FBM'].includes(code) ? '$' : '₹');

// Ledger registry: each inter-branch control ledger's owning branch + group. Names carry the
// COUNTER branch code so counterBranchOf resolves it deterministically.
const ledgers = [
  { name: 'Inter-Branch AMD',       branch: 'BOM', group: 'Sundry Debtors' },   // BOM → AMD receivable (₹)
  { name: 'Inter-Branch BOM (AMD)', branch: 'AMD', group: 'Sundry Creditors' }, // AMD → BOM payable   (₹) · mirror
  { name: 'Inter-Branch NBO',       branch: 'BOM', group: 'Sundry Debtors' },   // BOM → NBO receivable (₹)
  { name: 'Inter-Branch BOM (NBO)', branch: 'NBO', group: 'Sundry Creditors' }, // NBO → BOM payable   ($) · cross-ccy mirror
];
const tbRows = [
  { ledger: 'Inter-Branch AMD',       group: 'Sundry Debtors',   closingDebit: 1000 },
  { ledger: 'Inter-Branch BOM (AMD)', group: 'Sundry Creditors', closingCredit: 1000 },
  { ledger: 'Inter-Branch NBO',       group: 'Sundry Debtors',   closingDebit: 5000 },
  { ledger: 'Inter-Branch BOM (NBO)', group: 'Sundry Creditors', closingCredit: 60 },
];

describe('interbranch elimination model · per-currency, never blends ₹ + $', () => {
  const m = buildElimModel(tbRows, ledgers, curOf);
  const byLedger = Object.fromEntries([...m.receivables, ...m.payables].map((x) => [x.ledger, x]));

  test('a same-currency (₹) pair matches and auto-eliminates', () => {
    expect(byLedger['Inter-Branch AMD'].status).toBe('Matched');
    expect(byLedger['Inter-Branch AMD'].elim).toBe(1000);
    expect(byLedger['Inter-Branch AMD'].cur).toBe('₹');
  });

  test('a ₹ ⇄ $ pair is flagged Cross-Currency and never auto-eliminated', () => {
    expect(byLedger['Inter-Branch NBO'].status).toBe('Cross-Currency');
    expect(byLedger['Inter-Branch NBO'].elim).toBe(0);
    expect(byLedger['Inter-Branch BOM (NBO)'].status).toBe('Cross-Currency');
    expect(byLedger['Inter-Branch BOM (NBO)'].cur).toBe('$');
  });

  test('totals are split by book currency — ₹ and $ are never summed', () => {
    expect(m.currencies).toEqual(['$', '₹']);
    const inr = m.byCcy.find((t) => t.cur === '₹');
    const usd = m.byCcy.find((t) => t.cur === '$');
    expect(inr.totalRec).toBe(6000);   // 1000 + 5000, both ₹
    expect(inr.totalPay).toBe(1000);
    expect(inr.totalElim).toBe(1000);  // only the matched ₹ pair
    expect(inr.unmatchedRec).toBe(5000);
    expect(usd.totalPay).toBe(60);     // the $ payable stands alone
    expect(usd.totalRec).toBe(0);
    // there is NO blended figure anywhere (e.g. 1000 + 60 = 1060)
    expect(m.byCcy.some((t) => t.totalPay === 1060)).toBe(false);
  });

  test('branch rollup carries each branch its own currency', () => {
    const bs = Object.fromEntries(m.branchSummary.map((b) => [b.branch, b]));
    expect(bs.BOM.cur).toBe('₹'); expect(bs.BOM.rec).toBe(6000);
    expect(bs.NBO.cur).toBe('$'); expect(bs.NBO.pay).toBe(60);
  });
});
