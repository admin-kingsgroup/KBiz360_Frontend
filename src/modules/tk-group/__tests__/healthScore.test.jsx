import { scoreColor, gradeTone, verdict, subScores, branchRows, groupScore } from '../utils/healthScore';

const payload = {
  group: { health: 61, close: 64, adoption: 16, composite: 53, grade: 'D' },
  branches: [
    { branch: 'BOM', health: 0, close: 45, adoption: 38, composite: 21, grade: 'F' },
    { branch: 'AMD', health: 73, close: 73, adoption: 9, composite: 60, grade: 'C' },
  ],
};

describe('TK health scorecard · FE utils (pure)', () => {
  test('scoreColor bands', () => {
    expect(scoreColor(90)).toBe('#1a7a4c');
    expect(scoreColor(60)).toBe('#a86a10');
    expect(scoreColor(20)).toBe('#b23b3b');
  });

  test('gradeTone', () => {
    expect(gradeTone('A')).toBe('success');
    expect(gradeTone('C')).toBe('warning');
    expect(gradeTone('F')).toBe('danger');
  });

  test('verdict', () => {
    expect(verdict(90)).toBe('Healthy');
    expect(verdict(60)).toBe('Fair');
    expect(verdict(20)).toBe('Critical');
  });

  test('subScores: three weighted lenses, adoption as %', () => {
    const s = subScores(payload);
    expect(s.map((x) => x.key)).toEqual(['health', 'close', 'adoption']);
    expect(s[0]).toMatchObject({ value: 61, weight: '50%' });
    expect(s[2]).toMatchObject({ value: 16, weight: '20%', suffix: '%' });
  });

  test('groupScore + branchRows + fail-soft', () => {
    expect(groupScore(payload)).toMatchObject({ composite: 53, grade: 'D' });
    expect(branchRows(payload)).toHaveLength(2);
    expect(groupScore({})).toMatchObject({ composite: 0, grade: 'F' });
    expect(branchRows({})).toEqual([]);
  });
});
