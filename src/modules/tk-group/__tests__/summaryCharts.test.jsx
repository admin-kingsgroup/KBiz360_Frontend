import { polar, arcPath, linePoints, stackSegments, healthBand, SEM } from '../SummaryCharts';

describe('TK Control-Tower summary charts · pure geometry', () => {
  test('healthBand: ≥75 green · 60–74 amber · <60 red', () => {
    expect(healthBand(80)).toBe(SEM.ok);
    expect(healthBand(75)).toBe(SEM.ok);
    expect(healthBand(61)).toBe(SEM.warn);
    expect(healthBand(60)).toBe(SEM.warn);
    expect(healthBand(59)).toBe(SEM.err);
    expect(healthBand(0)).toBe(SEM.err);
  });

  test('polar: frac 0 → left, 0.5 → top, 1 → right of a semicircle', () => {
    const [lx, ly] = polar(50, 50, 40, 0);   // left
    const [tx, ty] = polar(50, 50, 40, 0.5);  // top
    const [rx, ry] = polar(50, 50, 40, 1);   // right
    expect(lx).toBeCloseTo(10); expect(ly).toBeCloseTo(50);
    expect(tx).toBeCloseTo(50); expect(ty).toBeCloseTo(10);
    expect(rx).toBeCloseTo(90); expect(ry).toBeCloseTo(50);
  });

  test('arcPath: large-arc flag is ALWAYS 0 (a top-semicircle sub-arc is ≤180°)', () => {
    // The gauge is a 180° semicircle; no sub-arc exceeds it, so the minor arc (flag 0)
    // is always correct. Deriving the flag from the span put big arcs on the wrong circle.
    expect(arcPath(50, 50, 40, 0, 0.4)).toMatch(/^M.* A40 40 0 0 1 /);
    expect(arcPath(50, 50, 40, 0, 0.8)).toMatch(/ A40 40 0 0 1 /); // was wrongly flagged 1
    expect(arcPath(50, 50, 40, 0, 1)).toMatch(/ A40 40 0 0 1 /);
    // Never select the major arc, for any span.
    [[0, 0.6], [0.3, 0.9], [0.6, 1], [0.75, 1]].forEach(([a, b]) =>
      expect(arcPath(50, 50, 40, a, b)).not.toMatch(/ 40 40 0 1 /));
  });

  test('arcPath: endpoints sit exactly on the gauge circle (radius r from centre)', () => {
    // Guards the real defect the flag bug caused: arcs bulging off the r=40 circle.
    const m = arcPath(50, 50, 40, 0.2, 0.85).match(/^M([\d.]+) ([\d.]+) A40 40 0 0 1 ([\d.]+) ([\d.]+)$/);
    expect(m).not.toBeNull();
    const [x0, y0] = [polar(50, 50, 40, 0.2)[0], polar(50, 50, 40, 0.2)[1]];
    expect(Math.hypot(Number(m[1]) - 50, Number(m[2]) - 50)).toBeCloseTo(40);
    expect(Math.hypot(Number(m[3]) - 50, Number(m[4]) - 50)).toBeCloseTo(40);
    expect(Number(m[1])).toBeCloseTo(x0); expect(Number(m[2])).toBeCloseTo(y0);
  });

  test('linePoints: even x spacing, y inverted and scaled to max', () => {
    const pts = linePoints([0, 50, 100], 100, 100, 0, 100);
    expect(pts[0]).toEqual([0, 100]);   // v=0 → bottom
    expect(pts[1]).toEqual([50, 50]);   // v=50 → middle
    expect(pts[2]).toEqual([100, 0]);   // v=100 → top
  });

  test('linePoints: single point sits at the left, guards divide-by-zero', () => {
    expect(linePoints([40], 100, 100, 6, 100)[0][0]).toBe(6);
  });

  test('stackSegments: cumulative x offsets, widths sum to 100%', () => {
    const segs = stackSegments([{ value: 164 }, { value: 13 }, { value: 5 }]);
    expect(segs[0].x).toBe(0);
    expect(segs[1].x).toBeCloseTo(segs[0].w);
    expect(segs.reduce((s, x) => s + x.w, 0)).toBeCloseTo(100);
  });

  test('stackSegments: all-zero input does not divide by zero', () => {
    const segs = stackSegments([{ value: 0 }, { value: 0 }]);
    expect(segs.every((s) => s.w === 0)).toBe(true);
  });
});
