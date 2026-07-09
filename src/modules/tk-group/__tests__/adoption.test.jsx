import { adoptionTone, badgeTone, adoptionVerdict, adoptionKpis, branchKeys, matrixRows, cellFor, centralCell } from '../utils/adoption';

describe('TK adoption · FE shaping (pure)', () => {
  test('adoptionTone bands', () => {
    expect(adoptionTone(null)).toBe('na');
    expect(adoptionTone(0)).toBe('dormant');
    expect(adoptionTone(50)).toBe('partial');
    expect(adoptionTone(80)).toBe('live');
    expect(adoptionTone(100)).toBe('live');
  });

  test('badgeTone maps tones to shared Badge tones', () => {
    expect(badgeTone('live')).toBe('success');
    expect(badgeTone('partial')).toBe('warning');
    expect(badgeTone('dormant')).toBe('neutral');
  });

  test('adoptionVerdict thresholds', () => {
    expect(adoptionVerdict(75)).toBe('Well adopted');
    expect(adoptionVerdict(45)).toBe('Partly adopted');
    expect(adoptionVerdict(18)).toBe('Early / migrating');
    expect(adoptionVerdict(5)).toBe('Barely used');
  });

  test('adoptionKpis: group first, then one per branch', () => {
    const d = { group: { adoption: 18 }, branches: [{ branch: 'BOM', adoption: 39 }, { branch: 'AMD', adoption: 10 }] };
    const k = adoptionKpis(d);
    expect(k[0]).toMatchObject({ key: 'group', value: '18%' });
    expect(k[1]).toMatchObject({ key: 'BOM', value: '39%' });
    expect(k).toHaveLength(3);
  });

  test('branchKeys + matrixRows read straight from payload', () => {
    const d = { branches: [{ branch: 'BOM' }, { branch: 'FBM' }], matrix: [{ module: 'core-acct' }] };
    expect(branchKeys(d)).toEqual(['BOM', 'FBM']);
    expect(matrixRows(d)).toHaveLength(1);
  });

  test('cellFor / centralCell resolve pct + tone, tolerate nulls', () => {
    const row = { byBranch: { BOM: 100, AMD: 0 }, central: null };
    expect(cellFor(row, 'BOM')).toEqual({ pct: 100, tone: 'live' });
    expect(cellFor(row, 'AMD')).toEqual({ pct: 0, tone: 'dormant' });
    expect(cellFor(row, 'NBO')).toEqual({ pct: null, tone: 'na' });
    expect(centralCell(row)).toEqual({ pct: null, tone: 'na' });
    expect(centralCell({ central: 92 })).toEqual({ pct: 92, tone: 'live' });
  });

  test('fail-soft on empty payload', () => {
    expect(adoptionKpis({})).toHaveLength(1); // just the group tile at 0%
    expect(branchKeys({})).toEqual([]);
    expect(matrixRows(undefined)).toEqual([]);
  });
});
