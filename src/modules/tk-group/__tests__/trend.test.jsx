import { directionTone, directionGlyph, trendKpis, branchRows, branchMax, trendVerdict } from '../utils/trend';

describe('TK scrutiny trend · FE shaping (pure)', () => {
  test('directionTone + glyph', () => {
    expect(directionTone('improving')).toBe('success');
    expect(directionTone('worsening')).toBe('danger');
    expect(directionTone('flat')).toBe('neutral');
    expect(directionGlyph('improving')).toBe('▲');
    expect(directionGlyph('worsening')).toBe('▼');
  });

  test('trendKpis: open/fixed/opened/avgfix from group', () => {
    const d = { group: { openNow: 48, fixed: 90, opened: 139, avgFixHrs: 131 } };
    const k = trendKpis(d);
    expect(k[0]).toMatchObject({ key: 'open', value: '48' });
    expect(k[1]).toMatchObject({ key: 'fixed', value: '90' });
    expect(k[3]).toMatchObject({ key: 'avgfix', value: '131h', sub: '5d' });
  });

  test('branchMax: max weekly opened/fixed, floor 1', () => {
    expect(branchMax({ weeks: [{ opened: 2, fixed: 5 }, { opened: 9, fixed: 1 }] })).toBe(9);
    expect(branchMax({ weeks: [] })).toBe(1);
    expect(branchMax(null)).toBe(1);
  });

  test('trendVerdict reflects direction', () => {
    expect(trendVerdict({ group: { direction: 'worsening', opened: 139, fixed: 90 } })).toMatch(/Worsening/);
    expect(trendVerdict({ group: { direction: 'improving', opened: 10, fixed: 20 } })).toMatch(/Improving/);
    expect(trendVerdict({})).toMatch(/Flat/);
  });

  test('branchRows fail-soft', () => {
    expect(branchRows({})).toEqual([]);
    expect(branchRows({ branches: [{ branch: 'BOM' }] })).toHaveLength(1);
  });
});
