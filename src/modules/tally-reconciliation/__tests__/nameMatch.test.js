// Name Matcher — pairing the tie-out's one-sided orphans. Fixtures are the REAL
// BOM · Dec-25 unmatched ledgers (from the live tie-out), so the four signals are
// exercised on the cases that motivated the feature: a 1-to-many TDS split, an
// amount-exact pair the fuzzy matcher got wrong, a code-hint rename the name match
// misses, and a genuinely structural ERP-only head.
import { buildNameMatcher, diceSim, codeHintName } from '../nameMatch';

const onlyErp = (erpLedger, code, erp, group = '') => ({ status: 'only-erp', erpLedger, ledger: erpLedger, code, erp, group });
const onlyTally = (tallyLedger, tally, group = '') => ({ status: 'only-tally', tallyLedger, ledger: tallyLedger, tally, group });

const ROWS = [
  // ── ERP-only orphans ──
  onlyErp('SVC2 CGST Output [BOM]', 'BOM-OTHER-TAXES-CGST-OUTPUT', -315, 'Duties & Taxes'),
  onlyErp('SVC2 SGST Output [BOM]', 'BOM-OTHER-TAXES-SGST-OUTPUT', -314.98, 'Duties & Taxes'),
  onlyErp('TDS Payable [BOM]', 'BOM-AUTO-TDS Payable', -8330, 'TDS & TCS'),
  onlyErp('IT-SVC2', 'AUTO-IT-Other Taxes', -2155.94, 'International Flights'),
  onlyErp('SVC2 Income', 'AUTO-Markup Income', -1343.63, 'Service Charges & Recoveries'),
  onlyErp('SVF Income', 'AUTO-Service Charge Income', -300, 'Service Charges & Recoveries'),
  onlyErp('DT-Supp SVCHG [Pur]', 'AUTO-DT-Supplier Service [Pur]', 254.28, 'Domestic Flights [Pur]'),
  onlyErp('IT-Supp SVCHG [Pur]', 'AUTO-IT-Supplier Service [Pur]', 248.33, 'International Flights [Pur]'),
  onlyErp('HR Consultancy Expenses', 'L1139', 45138, 'Variable Expenses'),
  // ── Tally-only orphans ──
  onlyTally('194C-TDS on Contract [Non.Co]', -452),
  onlyTally('194J-TDS on Professional Fees', -7878),
  onlyTally('CGST Purchase', 4098.42),
  onlyTally('Contracted Consultancy Expenses', 45138),
  onlyTally('DT- Miscellaneous Charges', -400),
  onlyTally('DT- Miscellaneous Charges-Pur', 400),
  onlyTally('DT-Service Charges-Pur', 254.28),
  onlyTally('DT-Supp SVCHG [IB-Pur]', 84.76),
  onlyTally('IT- Miscellaneous Charges', -3544),
  onlyTally('IT- Miscellaneous Charges-Pur', 3544),
  onlyTally('IT-Other Taxes', 1007.99),
  onlyTally('SGST Purchase', 4098.42),
];

describe('codeHintName', () => {
  test('peels system prefixes to expose the embedded legacy name', () => {
    expect(codeHintName('AUTO-IT-Other Taxes')).toBe('IT-Other Taxes');
    expect(codeHintName('BOM-AUTO-TDS Payable')).toBe('TDS Payable');
    expect(codeHintName('AUTO-Markup Income')).toBe('Markup Income');
  });
  test('returns empty for a serial or an all-caps slug (no readable name)', () => {
    expect(codeHintName('L1139')).toBe('');
    expect(codeHintName('BOM-OTHER-TAXES-CGST-OUTPUT')).toBe('');
    expect(codeHintName('')).toBe('');
  });
});

describe('diceSim', () => {
  test('identical strings score 1, unrelated score low', () => {
    expect(diceSim('IT-Other Taxes', 'IT-Other Taxes')).toBe(1);
    expect(diceSim('IT-Other Taxes', 'CGST Purchase')).toBeLessThan(0.4);
  });
});

describe('buildNameMatcher — BOM Dec-25', () => {
  const m = buildNameMatcher(ROWS);
  const find = (name) => m.erp.find((e) => e.name === name);

  test('empty input is safe', () => {
    const e = buildNameMatcher([]);
    expect(e.erp).toEqual([]);
    expect(e.summary.erpOrphans).toBe(0);
  });

  test('TDS Payable → 1-to-many split (194J + 194C), Σ exact', () => {
    const s = find('TDS Payable [BOM]').suggestion;
    expect(s.kind).toBe('split');
    expect(s.residual).toBe(0);
    const names = s.targets.map((i) => m.tally[i].name).sort();
    expect(names).toEqual(['194C-TDS on Contract [Non.Co]', '194J-TDS on Professional Fees']);
  });

  test('DT-Supp SVCHG [Pur] → exact-amount twin, NOT the fuzzy [IB-Pur] twin', () => {
    const s = find('DT-Supp SVCHG [Pur]').suggestion;
    expect(s.kind).toBe('exact');
    expect(m.tally[s.targets[0]].name).toBe('DT-Service Charges-Pur');
    expect(s.residual).toBe(0);
  });

  test('IT-SVC2 → code-hint rename (IT-Other Taxes); identity pairs even though the amount is off', () => {
    // The ERP code is literally "AUTO-IT-Other Taxes" — proof of lineage — so the pair
    // is made on identity. The live Tally closing is +1,007.99 Dr (opposite side to
    // ERP's 2,155.94 Cr), so a real residual is carried for the accountant to fix. The
    // matcher resolves WHO the account is; it never waves the amount through.
    const s = find('IT-SVC2').suggestion;
    expect(s.kind).toBe('code');
    expect(m.tally[s.targets[0]].name).toBe('IT-Other Taxes');
    expect(s.residual).toBe(-3163.93); // -2155.94 − (+1007.99)
    expect(Math.abs(s.residual)).toBeGreaterThan(1); // a gap that still blocks
  });

  test('HR Consultancy Expenses → exact amount (Contracted Consultancy Expenses)', () => {
    const s = find('HR Consultancy Expenses').suggestion;
    expect(s.kind).toBe('exact');
    expect(m.tally[s.targets[0]].name).toBe('Contracted Consultancy Expenses');
  });

  test('SVC2 CGST/SGST Output → no Tally twin (structural)', () => {
    expect(find('SVC2 CGST Output [BOM]').suggestion.kind).toBe('none');
    expect(find('SVC2 SGST Output [BOM]').suggestion.kind).toBe('none');
  });

  test('each Tally orphan is claimed at most once', () => {
    const claimed = m.erp.flatMap((e) => e.suggestion.targets);
    expect(claimed.length).toBe(new Set(claimed).size);
  });

  test('summary tallies the two sides', () => {
    expect(m.summary.erpOrphans).toBe(9);
    expect(m.summary.tallyOrphans).toBe(12);
    expect(m.summary.suggested).toBeGreaterThanOrEqual(4);
  });
});
