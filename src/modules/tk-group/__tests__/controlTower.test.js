import { scopeHealth, scopeSetup, scopeGates, scopeTrend, seriesMax } from '../utils/controlTower';

const HEALTH = { group: { score: 61 }, branches: [{ branch: 'BOM', score: 21 }, { branch: 'AMD', score: 58 }] };
const READY = { summary: { error: 164, warn: 13, info: 5 }, byBranch: [{ branch: 'BOM', error: 23, warn: 3, info: 0 }, { branch: 'AMD', error: 27, warn: 3, info: 0 }] };
const INTEG = {
  catalogue: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
  branches: [
    { branch: 'BOM', checks: [{ id: 'g1', status: 'pass' }, { id: 'g2', status: 'fail' }, { id: 'g3', status: 'warn' }] },
    { branch: 'AMD', checks: [{ id: 'g1', status: 'fail' }, { id: 'g2', status: 'pass' }, { id: 'g3', status: 'pass' }] },
  ],
};
const TREND = { branches: [
  { branch: 'BOM', weeks: [{ opened: 5, fixed: 2 }, { opened: 3, fixed: 4 }] },
  { branch: 'AMD', weeks: [{ opened: 1, fixed: 1 }, { opened: 2, fixed: 6 }] },
] };

describe('TK Control-Tower · Overview scoping (pure)', () => {
  test('scopeHealth: group score for ALL, branch score when focused', () => {
    expect(scopeHealth(HEALTH, 'ALL')).toMatchObject({ score: 61, label: 'Group' });
    expect(scopeHealth(HEALTH, 'BOM')).toMatchObject({ score: 21, label: 'BOM', hasData: true });
    expect(scopeHealth(HEALTH, 'ZZZ')).toMatchObject({ score: 0, hasData: false });
    expect(scopeHealth(undefined, 'ALL')).toMatchObject({ score: 0, hasData: false });
  });

  test('scopeSetup: summary split for ALL, byBranch slice when focused', () => {
    expect(scopeSetup(READY, 'ALL')).toEqual({ error: 164, warn: 13, info: 5, total: 182 });
    expect(scopeSetup(READY, 'BOM')).toEqual({ error: 23, warn: 3, info: 0, total: 26 });
    expect(scopeSetup({}, 'ALL')).toEqual({ error: 0, warn: 0, info: 0, total: 0 });
  });

  test('scopeGates (focused): counts that branch\'s check statuses', () => {
    expect(scopeGates(INTEG, 'BOM')).toEqual({ pass: 1, warn: 1, fail: 1, na: 0, total: 3 });
  });

  test('scopeGates (ALL): each gate takes its WORST status across branches', () => {
    // g1: fail(AMD) · g2: fail(BOM) · g3: warn(BOM) → 2 fail, 1 warn
    expect(scopeGates(INTEG, 'ALL')).toEqual({ pass: 0, warn: 1, fail: 2, na: 0, total: 3 });
  });

  test('scopeGates: empty payload → all zeros', () => {
    expect(scopeGates({}, 'ALL')).toEqual({ pass: 0, warn: 0, fail: 0, na: 0, total: 0 });
  });

  test('scopeTrend: per-branch weeks when focused, summed by week for ALL', () => {
    expect(scopeTrend(TREND, 'BOM')).toEqual({ opened: [5, 3], fixed: [2, 4] });
    expect(scopeTrend(TREND, 'ALL')).toEqual({ opened: [6, 5], fixed: [3, 10] });
    expect(scopeTrend({}, 'ALL')).toEqual({ opened: [], fixed: [] });
  });

  test('seriesMax: max across series, never below 1', () => {
    expect(seriesMax([3, 10], [6, 5])).toBe(10);
    expect(seriesMax([], [])).toBe(1);
  });
});
