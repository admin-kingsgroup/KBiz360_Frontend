// Cockpit branch Focus — the pure logic behind the in-cockpit spotlight. Default
// ALL (branchwise), a valid code drills one branch, anything invalid falls back to
// ALL so the cockpit can never scope to an out-of-scope branch.
import {
  FOCUS_ALL, COCKPIT_FOCUS_KEY, normalizeFocus, isFocused, focusLabel,
  effectiveScope, parseFocusParam, focusToParam, loadFocus, saveFocus, focusedBranches,
} from '../utils/cockpitFocus';

const CODES = ['BOM', 'AMD', 'MHUB', 'NBO', 'DAR', 'FBM'];

describe('normalizeFocus', () => {
  test('valid code (any case) resolves to the upper-cased code', () => {
    expect(normalizeFocus('BOM', CODES)).toBe('BOM');
    expect(normalizeFocus('nbo', CODES)).toBe('NBO');
    expect(normalizeFocus(' dar ', CODES)).toBe('DAR');
  });
  test('ALL, unknown, empty and non-strings all fall back to ALL', () => {
    expect(normalizeFocus('ALL', CODES)).toBe(FOCUS_ALL);
    expect(normalizeFocus('ZZZ', CODES)).toBe(FOCUS_ALL);   // not in scope → never leaks
    expect(normalizeFocus('', CODES)).toBe(FOCUS_ALL);
    expect(normalizeFocus(undefined, CODES)).toBe(FOCUS_ALL);
    expect(normalizeFocus(42, CODES)).toBe(FOCUS_ALL);
  });
  test('accepts a Set of valid codes too', () => {
    expect(normalizeFocus('AMD', new Set(CODES))).toBe('AMD');
  });
});

describe('isFocused / focusLabel / effectiveScope', () => {
  test('isFocused is true only for a real branch', () => {
    expect(isFocused('BOM')).toBe(true);
    expect(isFocused(FOCUS_ALL)).toBe(false);
    expect(isFocused('')).toBe(false);
  });
  test('focusLabel reads for the breadcrumb', () => {
    expect(focusLabel('BOM')).toBe('BOM');
    expect(focusLabel(FOCUS_ALL)).toBe('All branches');
    expect(focusLabel(FOCUS_ALL, 'TK Group Central')).toBe('TK Group Central');
  });
  test('effectiveScope is the one value oversight pages read', () => {
    expect(effectiveScope('BOM', CODES)).toBe('BOM');
    expect(effectiveScope('nope', CODES)).toBe(FOCUS_ALL);   // branchwise fallback
  });
});

describe('focusedBranches — the subset a cockpit page fans out over', () => {
  const ALL = [{ code: 'BOM' }, { code: 'AMD' }, { code: 'NBO' }];
  test('ALL / unfocused returns every branch (branchwise)', () => {
    expect(focusedBranches(FOCUS_ALL, ALL)).toEqual(ALL);
    expect(focusedBranches('', ALL)).toEqual(ALL);
  });
  test('a focus returns just that branch', () => {
    expect(focusedBranches('AMD', ALL)).toEqual([{ code: 'AMD' }]);
  });
  test('a focus not in the list falls back to all (never blank)', () => {
    expect(focusedBranches('ZZZ', ALL)).toEqual(ALL);
  });
  test('empty / missing list is safe', () => {
    expect(focusedBranches('BOM', [])).toEqual([]);
    expect(focusedBranches('BOM', undefined)).toEqual([]);
  });
});

describe('URL round-trip', () => {
  test('parseFocusParam reads ?focus=BOM (with or without leading ?)', () => {
    expect(parseFocusParam('?focus=BOM', CODES)).toBe('BOM');
    expect(parseFocusParam('focus=nbo&x=1', CODES)).toBe('NBO');
    expect(parseFocusParam('?x=1&focus=DAR', CODES)).toBe('DAR');
  });
  test('missing / invalid focus param → ALL', () => {
    expect(parseFocusParam('?x=1', CODES)).toBe(FOCUS_ALL);
    expect(parseFocusParam('', CODES)).toBe(FOCUS_ALL);
    expect(parseFocusParam('?focus=ZZZ', CODES)).toBe(FOCUS_ALL);
  });
  test('focusToParam emits nothing for ALL, a param for a branch', () => {
    expect(focusToParam('BOM')).toBe('focus=BOM');
    expect(focusToParam(FOCUS_ALL)).toBe('');
  });
  test('round-trips a focused branch', () => {
    const code = 'AMD';
    expect(parseFocusParam('?' + focusToParam(code), CODES)).toBe(code);
  });
});

describe('storage (injectable fake)', () => {
  function fakeStorage() {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), _map: m };
  }
  test('save then load a focused branch', () => {
    const s = fakeStorage();
    saveFocus('NBO', s);
    expect(s._map.get(COCKPIT_FOCUS_KEY)).toBe('NBO');
    expect(loadFocus(CODES, s)).toBe('NBO');
  });
  test('saving ALL clears the key (no residue)', () => {
    const s = fakeStorage();
    saveFocus('BOM', s);
    saveFocus(FOCUS_ALL, s);
    expect(s._map.has(COCKPIT_FOCUS_KEY)).toBe(false);
    expect(loadFocus(CODES, s)).toBe(FOCUS_ALL);
  });
  test('a persisted branch that is no longer in scope loads as ALL', () => {
    const s = fakeStorage();
    s.setItem(COCKPIT_FOCUS_KEY, 'XXX');
    expect(loadFocus(CODES, s)).toBe(FOCUS_ALL);
  });
  test('no storage available → ALL, no throw', () => {
    expect(loadFocus(CODES, null)).toBe(FOCUS_ALL);
    expect(() => saveFocus('BOM', null)).not.toThrow();
  });
});
