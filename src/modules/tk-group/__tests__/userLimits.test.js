import { resolveUserLimit, hasUserBranchOverride, userDefaultLimit } from '../utils/userLimits';

const store = {
  'faiz@travkings.com': { default: 500000, branches: { NBO: 6000 } },
  'sughra@travkings.com': { default: 100000, branches: {} },
};

describe('userLimits (FE) helpers', () => {
  test('resolveUserLimit: branch override → user default → null; case-insensitive', () => {
    expect(resolveUserLimit(store, 'faiz@travkings.com', 'NBO')).toBe(6000);
    expect(resolveUserLimit(store, 'faiz@travkings.com', 'BOM')).toBe(500000);
    expect(resolveUserLimit(store, 'FAIZ@Travkings.com', 'NBO')).toBe(6000);
    expect(resolveUserLimit(store, 'nobody@x.com', 'BOM')).toBe(null);
    expect(resolveUserLimit(store, 'faiz@travkings.com', 'default')).toBe(500000);
  });
  test('hasUserBranchOverride: only true for an explicit branch override', () => {
    expect(hasUserBranchOverride(store, 'faiz@travkings.com', 'NBO')).toBe(true);
    expect(hasUserBranchOverride(store, 'faiz@travkings.com', 'BOM')).toBe(false);
    expect(hasUserBranchOverride(store, 'faiz@travkings.com', 'default')).toBe(false);
  });
  test('userDefaultLimit returns the user default (or null)', () => {
    expect(userDefaultLimit(store, 'sughra@travkings.com')).toBe(100000);
    expect(userDefaultLimit(store, 'nobody@x.com')).toBe(null);
  });
});
