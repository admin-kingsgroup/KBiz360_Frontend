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

  test('arcPath: emits a valid arc, large-arc flag flips past the half', () => {
    expect(arcPath(50, 50, 40, 0, 0.4)).toMatch(/^M.* A40 40 0 0 1 /); // small arc
    expect(arcPath(50, 50, 40, 0, 0.8)).toMatch(/ A40 40 0 1 1 /);      // large arc
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
