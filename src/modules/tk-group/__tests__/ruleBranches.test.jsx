import { ruleRegime, ruleAppliesTo, regimeStats, REGIME_LABEL } from '../utils/ruleBranches';
import { RULE_BOOK, ruleBookStats } from '../utils/ruleBook.data';

const INDIA = ['BOMMB', 'BOM', 'AMD'];

describe('TK rule book · branch applicability (pure)', () => {
  test('ruleRegime — keyword classification', () => {
    expect(ruleRegime({ t: 'Default output/service GST rate is 18%.' })).toBe('india');
    expect(ruleRegime({ t: 'Single VAT rate per Africa branch — Kenya(NBO) 16%.' })).toBe('africa');
    expect(ruleRegime({ t: 'A journal must have at least two postings.' })).toBe('all');
    // A rule describing BOTH regimes is regime-aware → common.
    expect(ruleRegime({ t: 'Tax regime: NBO/DAR/FBM run VAT (Africa); all other branches run India GST.' })).toBe('all');
    // "not a VAT branch" is an India-only condition, not an Africa rule.
    expect(ruleRegime({ t: 'TCS is added to the total only when: not noVat, not a VAT branch, not B2B.' })).toBe('india');
  });

  test('ruleRegime — explicit regime override wins', () => {
    expect(ruleRegime({ t: 'Mentions GST everywhere', regime: 'all' })).toBe('all');
    expect(ruleRegime({ t: 'No keywords at all', regime: 'africa' })).toBe('africa');
  });

  test('ruleAppliesTo — common everywhere, regime rules only on their branches', () => {
    const common = { t: 'A journal must have at least two postings.' };
    const gst = { t: 'Default output/service GST rate is 18%.' };
    const vat = { t: 'Single VAT rate per Africa branch — Kenya(NBO) 16%.' };
    expect(ruleAppliesTo(common, 'NBO', INDIA)).toBe(true);
    expect(ruleAppliesTo(gst, 'BOM', INDIA)).toBe(true);
    expect(ruleAppliesTo(gst, 'NBO', INDIA)).toBe(false);
    expect(ruleAppliesTo(vat, 'NBO', INDIA)).toBe(true);
    expect(ruleAppliesTo(vat, 'AMD', INDIA)).toBe(false);
  });

  test('regimeStats partitions the whole book', () => {
    const s = regimeStats(RULE_BOOK);
    expect(s.all + s.india + s.africa).toBe(ruleBookStats().total);
    expect(s.india).toBeGreaterThan(20); // GST/TCS/TDS corpus
    expect(s.africa).toBeGreaterThan(0);
    expect(REGIME_LABEL.india).toMatch(/GST/);
  });
});
