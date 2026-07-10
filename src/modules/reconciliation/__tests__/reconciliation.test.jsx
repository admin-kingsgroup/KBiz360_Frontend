// Reconciliation module · pure helpers — tier metadata, status/source tones,
// progress math, branch currency and the Rule Book content the page renders.
import {
  BRANCHES, TIERS, tierOf, statusMeta, sourceMeta, tierProgress, chainProgress,
  fmtAmt, currencyOf, openExceptions, GOLDEN_RULES, ROLE_MATRIX,
  pendingStateMeta, fmtDue, periodOptions, visibleTiers, branchCodeOf,
  classifyOptionsFor, classificationLabel, MATCH_TYPE_LABELS, BANK_CLASSIFY, PARTY_CLASSIFY,
} from '../utils';

describe('reconciliation · tiers', () => {
  test('four tiers in ladder order with the designed chains', () => {
    expect(TIERS.map((t) => t.key)).toEqual(['weekly', 'month', 'quarter', 'year']);
    expect(tierOf('weekly').chain.map((s) => s.role)).toEqual(['Branch Accountant', 'AE', 'FM', 'Director']);
    expect(tierOf('month').chain.map((s) => s.role)).toEqual(['AE', 'FM', 'Director', 'Owner']);
    expect(tierOf('quarter').chain.map((s) => s.role)).toEqual(['AE', 'FM', 'Director', 'Owner', 'Statutory']);
    expect(tierOf('year').chain.map((s) => s.role)).toEqual(['AE', 'FM', 'Director', 'Owner', 'Auditor', 'Owner']);
  });
  test('weekly is digital; the three closing tiers are physical', () => {
    expect(tierOf('weekly').mode).toBe('digital');
    ['month', 'quarter', 'year'].forEach((k) => expect(tierOf(k).mode).toBe('physical'));
  });
  test('unknown tier falls back to weekly (never crashes a row)', () => {
    expect(tierOf('nope').key).toBe('weekly');
  });
  test('Branch Accountant sees the weekly tier ONLY; central roles see all four', () => {
    expect(visibleTiers('Branch Accountant').map((t) => t.key)).toEqual(['weekly']);
    ['Sr. Accounts Executive', 'Senior Finance Manager', 'Director', 'Super Admin', undefined].forEach((r) => {
      expect(visibleTiers(r)).toHaveLength(4);
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
  test('role matrix: Branch Accountant is weekly-only; Owner locks the month', () => {
    const ba = ROLE_MATRIX.find((r) => r.role === 'Branch Accountant');
    expect(ba.weekly).toBe('Prepare');
    expect([ba.month, ba.quarter, ba.year]).toEqual(['—', '—', '—']);
    expect(ROLE_MATRIX.find((r) => r.role === 'Owner').month).toBe('Lock');
    expect(ROLE_MATRIX.find((r) => r.role === 'Auditor').year).toBe('Attest');
  });
});
