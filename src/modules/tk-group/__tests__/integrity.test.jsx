import { statusTone, statusGlyph, integrityKpis, branchCards, matrixRows, branchKeys, findingRows, focusView } from '../utils/integrity';

const payload = {
  group: { score: 88, fails: 3, warns: 3, closeReadyBranches: 5, totalBranches: 6 },
  catalogue: [
    { id: 'journal-drift', label: 'Journal drift', category: 'Integrity' },
    { id: 'sod-self-approved', label: 'Self-approval', category: 'Governance' },
  ],
  branches: [
    { branch: 'BOM', score: 63, fails: 2, warns: 0, closeReady: false, checks: [
      { id: 'journal-drift', status: 'pass', count: 0, detail: 'clean', sample: [] },
      { id: 'sod-self-approved', status: 'fail', count: 78, detail: '78 self-approved', sample: ['PMT/1', 'PMT/2'] },
    ] },
    { branch: 'AMD', score: 100, fails: 0, warns: 0, closeReady: true, checks: [
      { id: 'journal-drift', status: 'pass', count: 0, detail: 'clean', sample: [] },
      { id: 'sod-self-approved', status: 'pass', count: 0, detail: 'clean', sample: [] },
    ] },
  ],
};

describe('TK integrity · FE shaping (pure)', () => {
  test('statusTone + glyph', () => {
    expect(statusTone('fail')).toBe('danger');
    expect(statusTone('pass')).toBe('success');
    expect(statusTone('warn')).toBe('warning');
    expect(statusTone('na')).toBe('neutral');
    expect(statusGlyph('pass')).toBe('✓');
    expect(statusGlyph('fail')).toBe('✗');
  });

  test('integrityKpis: score, fails, warns, ready x/total', () => {
    const k = integrityKpis(payload);
    expect(k[0]).toMatchObject({ key: 'score', value: '88' });
    expect(k[1]).toMatchObject({ key: 'fails', value: '3' });
    expect(k[3]).toMatchObject({ key: 'ready', value: '5/6' });
  });

  test('branchCards preserve worst-first order + closeReady', () => {
    const c = branchCards(payload);
    expect(c[0]).toMatchObject({ branch: 'BOM', closeReady: false, fails: 2 });
    expect(c[1]).toMatchObject({ branch: 'AMD', closeReady: true });
  });

  test('matrixRows: one row per check, status per branch', () => {
    const rows = matrixRows(payload);
    expect(rows).toHaveLength(2);
    const sod = rows.find((r) => r.id === 'sod-self-approved');
    expect(sod.byBranch).toEqual({ BOM: 'fail', AMD: 'pass' });
    expect(branchKeys(payload)).toEqual(['BOM', 'AMD']);
  });

  test('findingRows: only fail/warn, fails first, carries the check id for drill-down', () => {
    const f = findingRows(payload);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ id: 'sod-self-approved', branch: 'BOM', status: 'fail', count: 78 });
  });

  test('fail-soft on empty payload', () => {
    expect(integrityKpis({})[0]).toMatchObject({ value: '100' });
    expect(branchCards({})).toEqual([]);
    expect(matrixRows({})).toEqual([]);
    expect(findingRows(undefined)).toEqual([]);
  });

  describe('focusView (cockpit Focus scoping)', () => {
    test('ALL passes through unchanged', () => { expect(focusView(payload, 'ALL')).toBe(payload); });
    test('a branch keeps it, rebuilds group from it, keeps the catalogue (matrix stays)', () => {
      const v = focusView(payload, 'BOM');
      expect(v.branches).toEqual([payload.branches[0]]);
      expect(v.group).toEqual({ score: 63, fails: 2, warns: 0, closeReadyBranches: 0, totalBranches: 1 });
      expect(v.catalogue).toBe(payload.catalogue); // gate list preserved
      expect(integrityKpis(v)[3]).toMatchObject({ key: 'ready', value: '0/1' }); // no focus arg → group form
      expect(integrityKpis(v, 'BOM')[3]).toMatchObject({ label: 'Close-ready?', value: 'No' }); // focused copy
      expect(integrityKpis(v, 'BOM')[0]).toMatchObject({ key: 'score', value: '63', sub: 'BOM' });
      expect(matrixRows(v).find((r) => r.id === 'sod-self-approved').byBranch).toEqual({ BOM: 'fail' });
    });
    test('a close-ready branch → "Yes"', () => {
      expect(integrityKpis(focusView(payload, 'AMD'), 'AMD')[3]).toMatchObject({ value: 'Yes' });
    });
    test('unknown branch → empty, perfect group', () => {
      expect(focusView(payload, 'ZZZ')).toMatchObject({ branches: [], group: { score: 100, fails: 0, totalBranches: 0 } });
    });
  });
});
