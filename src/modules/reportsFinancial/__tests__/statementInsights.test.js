// Math behind the statement views' proportion bars + insights rail.
import { share, topByGP, lowestGp } from '../statementInsights';

describe('share', () => {
  test('percentage of a base, magnitude only', () => {
    expect(share(50, 200)).toBe(25);
    expect(share(-40, 200)).toBe(20);      // sign-agnostic
    expect(share(100, -400)).toBe(25);     // base sign-agnostic
  });
  test('zero / missing base is safe (no divide-by-zero)', () => {
    expect(share(50, 0)).toBe(0);
    expect(share(50, null)).toBe(0);
    expect(share(null, 200)).toBe(0);
  });
});

describe('topByGP', () => {
  const modules = [
    { name: 'Flights', icon: '✈', gp: 488, gpPct: 2 },
    { name: 'Hotels', icon: '🏨', gp: 375, gpPct: 8.4 },
    { name: 'Holiday', icon: '🏝', gp: 170, gpPct: 13 },
    { name: 'Misc', gp: 0, gpPct: 0 },
    { name: 'Unspecified', gp: -6, gpPct: -100 },  // negative GP excluded
  ];
  test('ranks positive-GP modules desc with bar widths relative to the top', () => {
    const top = topByGP(modules, 5);
    expect(top.map((m) => m.name)).toEqual(['Flights', 'Hotels', 'Holiday']);
    expect(top[0].bar).toBe(100);                 // biggest = full bar
    expect(top[1].bar).toBeCloseTo((375 / 488) * 100, 5);
  });
  test('respects the n cap and tolerates empty input', () => {
    expect(topByGP(modules, 2).map((m) => m.name)).toEqual(['Flights', 'Hotels']);
    expect(topByGP(null)).toEqual([]);
    expect(topByGP([])).toEqual([]);
  });
});

describe('lowestGp', () => {
  test('lowest gpPct among modules that actually traded', () => {
    const mods = [
      { name: 'A', sales: 100, gpPct: 12 },
      { name: 'B', sales: 50, gpPct: 3 },
      { name: 'C', sales: 0, gpPct: -99 },   // no sales → ignored
    ];
    expect(lowestGp(mods).name).toBe('B');
  });
  test('null when nothing traded', () => {
    expect(lowestGp([{ name: 'X', sales: 0, gpPct: 1 }])).toBeNull();
    expect(lowestGp(null)).toBeNull();
  });
});
