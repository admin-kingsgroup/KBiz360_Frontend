import { directionTone, directionGlyph, trendKpis, branchRows, branchMax, trendVerdict, focusView } from '../utils/trend';

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

  describe('focusView (cockpit Focus scoping)', () => {
    const d = { weeks: 8, branches: [
      { branch: 'BOM', openNow: 30, opened: 50, fixed: 40, avgFixHrs: 120, direction: 'improving', weeks: [{ opened: 5, fixed: 4 }] },
      { branch: 'AMD', openNow: 8, opened: 10, fixed: 12, avgFixHrs: 60, direction: 'improving', weeks: [{ opened: 1, fixed: 2 }] },
    ] };
    test('ALL passes through unchanged', () => { expect(focusView(d, 'ALL')).toBe(d); });
    test('a branch takes its own open/opened/fixed/direction as the group', () => {
      const v = focusView(d, 'BOM');
      expect(v.branches).toEqual([d.branches[0]]);
      expect(v.group).toEqual({ openNow: 30, fixed: 40, opened: 50, avgFixHrs: 120, direction: 'improving' });
      expect(trendKpis(v)[0]).toMatchObject({ key: 'open', value: '30' });
    });
    test('unknown branch → empty, flat group', () => {
      expect(focusView(d, 'ZZZ')).toMatchObject({ branches: [], group: { openNow: 0, direction: 'flat' } });
    });
  });
});
