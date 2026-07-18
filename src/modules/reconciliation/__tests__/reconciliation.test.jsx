// Reconciliation module · pure helpers — tier metadata, status/source tones,
// progress math, branch currency and the Rule Book content the page renders.
import {
  BRANCHES, TIERS, tierOf, statusMeta, sourceMeta, tierProgress, chainProgress,
  fmtAmt, currencyOf, openExceptions, GOLDEN_RULES, ROLE_MATRIX,
  pendingStateMeta, fmtDue, periodOptions, visibleTiers, canEditCycleConfig, branchCodeOf,
  classifyOptionsFor, classificationLabel, MATCH_TYPE_LABELS, BANK_CLASSIFY, PARTY_CLASSIFY,
  chainForCert, isStatementLedgerCert, tierSignersLabel,
} from '../utils';

describe('reconciliation · tiers', () => {
  test('five tiers in ladder order with the designed chains', () => {
    expect(TIERS.map((t) => t.key)).toEqual(['daily', 'weekly', 'month', 'quarter', 'year']);
    // Soft (branch, freeze-only): Daily = BA→AE, Weekly = BA→AE→FM.
    expect(tierOf('daily').chain.map((s) => s.role)).toEqual(['Branch Accountant', 'AE']);
    expect(tierOf('weekly').chain.map((s) => s.role)).toEqual(['Branch Accountant', 'AE', 'FM']);
    // Hard (TK Group, certification): AE freeze → FM verify → Director certify → Owner lock.
    ['month', 'quarter', 'year'].forEach((k) => {
      expect(tierOf(k).chain.map((s) => s.role)).toEqual(['AE', 'FM', 'Director', 'Owner']);
    });
  });
  test('Daily & Weekly are digital; the three closing tiers are physical', () => {
    ['daily', 'weekly'].forEach((k) => expect(tierOf(k).mode).toBe('digital'));
    ['month', 'quarter', 'year'].forEach((k) => expect(tierOf(k).mode).toBe('physical'));
  });
  test('unknown tier falls back to the first tier (never crashes a row)', () => {
    expect(tierOf('nope').key).toBe('daily');
  });
  test('Branch Accountant sees Daily, Weekly & Monthly (the branch freeze tiers); central roles see all five', () => {
    expect(visibleTiers('Branch Accountant').map((t) => t.key)).toEqual(['daily', 'weekly', 'month']);
    ['Sr. Accounts Executive', 'Senior Finance Manager', 'Director', 'Super Admin', undefined].forEach((r) => {
      expect(visibleTiers(r)).toHaveLength(5);
    });
  });

  test('chainForCert: a MONTH statement ledger (bank/client/supplier) carries the branch-freeze step; other heads keep the AE-first chain', () => {
    const bankCert = { tier: 'month', ledger: { subGroup: 'Bank Accounts' } };
    const debtorCert = { tier: 'month', ledger: { subGroup: 'Sundry Debtors' } };
    const capitalCert = { tier: 'month', ledger: { subGroup: 'Capital Account' } };
    expect(isStatementLedgerCert(bankCert)).toBe(true);
    expect(isStatementLedgerCert(debtorCert)).toBe(true);
    expect(isStatementLedgerCert(capitalCert)).toBe(false);
    expect(chainForCert(bankCert).map((s) => s.role)).toEqual(['Branch Accountant', 'AE', 'FM', 'Director', 'Owner']);
    expect(chainForCert(capitalCert).map((s) => s.role)).toEqual(['AE', 'FM', 'Director', 'Owner']);
    // Quarter never splits; weekly is its own branch chain.
    expect(chainForCert({ tier: 'quarter', ledger: { subGroup: 'Bank Accounts' } }).map((s) => s.role)).toEqual(['AE', 'FM', 'Director', 'Owner']);
    expect(chainForCert({ tier: 'weekly', ledger: { subGroup: 'Bank Accounts' } }).map((s) => s.role)).toEqual(['Branch Accountant', 'AE', 'FM']);
    // chainProgress on a month bank cert reflects the 5-step ladder.
    expect(chainProgress({ ...bankCert, signatures: [{ role: 'Branch Accountant' }] })).toMatchObject({ done: 1, total: 5 });
    expect(chainProgress({ ...bankCert, signatures: [{ role: 'Branch Accountant' }] }).next.role).toBe('AE');
    expect(tierSignersLabel('month')).toMatch(/Branch Accountant/);
    expect(tierSignersLabel('weekly')).toBe('Branch Accountant → AE → FM');
  });
  test('cycle CONFIG is FM/Director/Owner only — AE and Branch Accountant cannot reshape the scope', () => {
    ['Senior Finance Manager', 'FM', 'Director', 'Owner', 'Super Admin', 'super_admin'].forEach((r) => {
      expect(canEditCycleConfig(r)).toBe(true);
    });
    ['Sr. Accounts Executive', 'AE', 'Branch Accountant', '', undefined].forEach((r) => {
      expect(canEditCycleConfig(r)).toBe(false);
    });
  });
});

describe('reconciliation · tones & formatting', () => {
  test('status → badge tone', () => {
    expect(statusMeta('locked')).toMatchObject({ tone: 'navy', label: 'Locked' });
    expect(statusMeta('signed').tone).toBe('success');
    expect(statusMeta('bogus').label).toBe('Open');
  });
  test('attachment source → tone', () => {
    expect(sourceMeta('physical').tone).toBe('warning');
    expect(sourceMeta('feed').tone).toBe('success');
    expect(sourceMeta(undefined).label).toBe('Download');
  });
  test('branchCodeOf: handles the app’s branch OBJECT, plain codes, ALL and junk', () => {
    expect(branchCodeOf({ code: 'AMD', city: 'Ahmedabad' })).toBe('AMD');
    expect(branchCodeOf('NBO')).toBe('NBO');
    expect(branchCodeOf('ALL')).toBe('');       // group mode → no single branch
    expect(branchCodeOf(null)).toBe('');
    expect(branchCodeOf({ code: 'ZZZ' })).toBe('');
  });
  test('branch currency mirrors the BOOKS: ₹ for India, $ for ALL Africa (USD books)', () => {
    expect(currencyOf('BOM')).toBe('₹');
    expect(currencyOf('NBO')).toBe('$');   // books are USD — KES is print-only secondary
    expect(currencyOf('DAR')).toBe('$');   // books are USD — TZS is print-only secondary
    expect(currencyOf('FBM')).toBe('$');   // USD-only branch
    expect(BRANCHES).toHaveLength(6);
  });
  test('fmtAmt groups by currency: lakh/crore for ₹, thousands for $, — for empty', () => {
    expect(fmtAmt(125000, 'BOM')).toBe('₹ 1,25,000');
    expect(fmtAmt(125000, 'NBO')).toBe('$ 125,000'); // NOT $ 1,25,000
    expect(fmtAmt(125000, 'FBM')).toBe('$ 125,000');
    expect(fmtAmt(null, 'BOM')).toBe('—');
  });
});

describe('reconciliation · progress math', () => {
  test('tierProgress: done = signed + locked', () => {
    expect(tierProgress({ total: 10, signed: 3, locked: 5 })).toEqual({ total: 10, done: 8, pct: 80 });
    expect(tierProgress({})).toEqual({ total: 0, done: 0, pct: 0 });
  });
  test('chainProgress names the next signer', () => {
    const cert = { tier: 'month', signatures: [{ role: 'AE' }, { role: 'FM' }] };
    const p = chainProgress(cert);
    expect(p).toMatchObject({ done: 2, total: 4 });
    expect(p.next.role).toBe('Director');
    expect(chainProgress({ tier: 'month', signatures: [1, 2, 3, 4] }).next).toBeNull();
  });
  test('openExceptions counts only unresolved', () => {
    expect(openExceptions({ exceptions: [{ resolved: true }, { resolved: false }, {}] })).toBe(2);
    expect(openExceptions(null)).toBe(0);
  });
});

describe('reconciliation · pending board display', () => {
  test('pendingStateMeta: upcoming/in-progress/pending/closed tones', () => {
    expect(pendingStateMeta({ upcoming: true })).toMatchObject({ tone: 'info', label: 'Upcoming' });
    expect(pendingStateMeta({ state: 'in-progress' })).toMatchObject({ tone: 'warning' });
    expect(pendingStateMeta({ state: 'not-started' })).toMatchObject({ tone: 'danger', label: 'Pending' });
    expect(pendingStateMeta({ state: 'closed' })).toMatchObject({ tone: 'navy' });
  });
  test('periodOptions: backlog periods first, then current; deduped; upcoming excluded', () => {
    const rows = [
      { tier: 'month', period: '2026-04', state: 'not-started' },
      { tier: 'month', period: '2026-05', state: 'in-progress' },
      { tier: 'weekly', period: '2026-W29', upcoming: true },
      { tier: 'year', period: 'FY2025-26', state: 'not-started' },
    ];
    expect(periodOptions('month', '2026-07', rows).map((o) => o.value)).toEqual(['2026-04', '2026-05', '2026-07']);
    expect(periodOptions('weekly', '2026-W28', rows).map((o) => o.value)).toEqual(['2026-W28']); // upcoming row excluded
    expect(periodOptions('year', 'FY2026-27', rows).map((o) => o.value)).toEqual(['FY2025-26', 'FY2026-27']);
    expect(periodOptions('month', '2026-04', [{ tier: 'month', period: '2026-04', state: 'not-started' }]).map((o) => o.value)).toEqual(['2026-04']); // dedupe vs current
  });
  test('fmtDue: weekly cycles show their Friday; upcoming is flagged', () => {
    expect(fmtDue({ tier: 'weekly', dueOn: '2026-07-17' })).toBe('Fri, 17 Jul 2026');
    expect(fmtDue({ tier: 'weekly', dueOn: '2026-07-17', upcoming: true })).toBe('Fri, 17 Jul 2026 (upcoming)');
    expect(fmtDue({ tier: 'month' })).toBe('—');
    expect(fmtDue({ tier: 'weekly' })).toBe('Friday');
  });
});

describe('reconciliation · scrutiny classification vocabularies', () => {
  test('bank vs party (SOA) lists — the perspective switches the vocabulary', () => {
    expect(classifyOptionsFor('bank')).toBe(BANK_CLASSIFY);
    expect(classifyOptionsFor('party')).toBe(PARTY_CLASSIFY);
    expect(classifyOptionsFor(undefined)).toBe(BANK_CLASSIFY);
    expect(BANK_CLASSIFY.map((c) => c.value)).toEqual(['unpresented', 'in-transit', 'to-post', 'other']);
    expect(PARTY_CLASSIFY.map((c) => c.value)).toEqual(['invoice-not-received', 'payment-in-transit', 'tds-deduction', 'credit-note-pending', 'disputed', 'rate-difference', 'other']);
  });
  test('labels resolve across both vocabularies; match-type chips named', () => {
    expect(classificationLabel('unpresented')).toBe('Unpresented cheque');
    expect(classificationLabel('credit-note-pending')).toBe('Credit note / ADM pending');
    expect(MATCH_TYPE_LABELS['ref:amount-differs']).toBe('rate difference');
    expect(MATCH_TYPE_LABELS['carry-cleared']).toBe('carried · cleared');
    expect(MATCH_TYPE_LABELS.learned).toBe('learned');
  });
});

describe('reconciliation · rule book content', () => {
  test('eight golden rules, numbered 01–08', () => {
    expect(GOLDEN_RULES).toHaveLength(8);
    expect(GOLDEN_RULES.map((r) => r.n)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
  });
  test('role matrix: Branch Accountant freezes daily, weekly & the monthly statement heads; Owner locks the month', () => {
    const ba = ROLE_MATRIX.find((r) => r.role === 'Branch Accountant');
    expect([ba.daily, ba.weekly]).toEqual(['Freeze', 'Freeze']);
    expect(ba.month).toMatch(/Freeze/);            // bank/client/supplier freeze at the branch
    expect([ba.quarter, ba.year]).toEqual(['—', '—']);
    expect(ROLE_MATRIX.find((r) => r.role === 'Owner').month).toBe('Lock');
    // AE VERIFIES the branch monthly freeze and prepares the other heads; external
    // Statutory/Auditor rows remain removed.
    expect(ROLE_MATRIX.find((r) => r.role === 'AE').month).toMatch(/Verify/);
    expect(ROLE_MATRIX.find((r) => r.role === 'Auditor')).toBeUndefined();
  });
});
