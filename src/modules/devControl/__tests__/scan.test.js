/* mergeScan / groupByCategory (modules/devControl/scan.js) — the contract that
   fuses the LIVE backend scan with the BUILD-time frontend scan for the Control
   Tower ▸ Development lens. Locks: live FE findings win over the build copy when
   the backend reached the FE tree; the build copy fills in when it didn't; the
   API (BE) findings always come from live; de-dup + counts + worst-first order. */

// scan.js imports the generated build scan; stub it to a known 2-finding shape
// so the test is deterministic regardless of the real committed file.
jest.mock('../../../core/devScan.generated', () => ({
  DEV_SCAN: {
    tree: 'FE', filesScanned: 100,
    counts: { total: 2, bySeverity: { high: 1, medium: 0, low: 1 }, byCategory: {} },
    findings: [
      { id: 'FE:a.jsx:1:broken-import', tree: 'FE', rule: 'broken-import', category: 'structure', severity: 'high', title: 'x', remark: 'r', file: 'a.jsx', line: 1, snippet: '', source: 'build' },
      { id: 'FE:b.jsx:2:todo', tree: 'FE', rule: 'todo', category: 'broken-code', severity: 'low', title: 'x', remark: 'r', file: 'b.jsx', line: 2, snippet: '', source: 'build' },
    ],
  },
}));

import { mergeScan, groupByCategory } from '../scan';

const beFinding = { id: 'BE:s.js:9:empty-catch', tree: 'BE', rule: 'empty-catch', category: 'broken-code', severity: 'low', title: 'x', remark: 'r', file: 's.js', line: 9, snippet: '', source: 'live' };
const feLiveFinding = { id: 'FE:c.jsx:3:dead-route', tree: 'FE', rule: 'dead-route', category: 'routing', severity: 'high', title: 'x', remark: 'r', file: 'c.jsx', line: 3, snippet: '', source: 'live' };

describe('mergeScan', () => {
  test('FE scanned live → live FE findings win, build copy dropped', () => {
    const m = mergeScan({ roots: [{ tree: 'BE', scanned: true }, { tree: 'FE', scanned: true }], findings: [beFinding, feLiveFinding], counts: {} });
    expect(m.feLive).toBe(true);
    expect(m.feFromBuild).toBe(false);
    // build's a.jsx / b.jsx must NOT appear — only the live BE + FE findings
    expect(m.findings.map((f) => f.id).sort()).toEqual([beFinding.id, feLiveFinding.id].sort());
    expect(m.counts.total).toBe(2);
    expect(m.counts.byTree).toEqual({ FE: 1, BE: 1 });
  });

  test('FE NOT scanned live (prod) → build FE findings fill in, BE from live', () => {
    const m = mergeScan({ roots: [{ tree: 'BE', scanned: true }], findings: [beFinding], counts: {} });
    expect(m.feLive).toBe(false);
    expect(m.feFromBuild).toBe(true);
    // BE live + 2 build FE findings = 3
    expect(m.counts.total).toBe(3);
    expect(m.counts.byTree).toEqual({ FE: 2, BE: 1 });
  });

  test('de-dupes identical ids across live + build (safety net)', () => {
    // live returns an FE finding with the SAME id the build copy has, but roots
    // does NOT mark FE scanned → build is included; the dup must collapse to one.
    const dup = { ...feLiveFinding, id: 'FE:a.jsx:1:broken-import' };
    const m = mergeScan({ roots: [{ tree: 'BE', scanned: true }], findings: [dup], counts: {} });
    expect(m.findings.filter((f) => f.id === 'FE:a.jsx:1:broken-import')).toHaveLength(1);
  });

  test('worst-first: high before low', () => {
    const m = mergeScan({ roots: [{ tree: 'FE', scanned: true }], findings: [beFinding, feLiveFinding], counts: {} });
    expect(m.findings[0].severity).toBe('high');
  });

  test('unreachable backend → empty live, uses build, flag set', () => {
    const m = mergeScan({ findings: [], unreachable: true });
    expect(m.unreachable).toBe(true);
    expect(m.beScanned).toBe(false);
    expect(m.counts.total).toBe(2); // build only
  });

  test('null/undefined live payload never throws', () => {
    expect(() => mergeScan(undefined)).not.toThrow();
    expect(mergeScan(undefined).counts.total).toBe(2); // falls back to build
  });
});

describe('groupByCategory', () => {
  test('groups worst-category-first, only non-empty categories', () => {
    const groups = groupByCategory([beFinding, feLiveFinding]);
    expect(groups.map((g) => g.category)).toEqual(['routing', 'broken-code']); // routing before broken-code
    expect(groups[0].findings).toHaveLength(1);
    expect(groups[0].label).toBeTruthy();
  });
});
