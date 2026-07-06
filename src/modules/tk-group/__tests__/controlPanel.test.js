import { approvalChainView, asEmailList, POWER_SCREENS, POWER_SCREEN_KEYS, CONTROL_LISTS, ROLE_CAPS, CAP_COLS } from '../utils/controlPanel';

describe('Power Console structure', () => {
  test('17 screens across 4 groups', () => {
    expect(POWER_SCREENS.map((g) => g.group)).toEqual(['Enforcement', 'Access & Rights', 'Governance', 'Oversight']);
    expect(POWER_SCREEN_KEYS).toHaveLength(17);
  });
  test('includes the three added screens', () => {
    for (const k of ['notifications', 'breakglass', 'reports']) expect(POWER_SCREEN_KEYS).toContain(k);
  });
  test('screen keys are unique', () => {
    expect(new Set(POWER_SCREEN_KEYS).size).toBe(POWER_SCREEN_KEYS.length);
  });
  test('control lists exist for every list-screen and carry name + description', () => {
    for (const k of ['rights', 'sod', 'security', 'entry', 'notifications', 'reports']) {
      expect(Array.isArray(CONTROL_LISTS[k])).toBe(true);
      expect(CONTROL_LISTS[k].every((c) => c.nm && c.ds)).toBe(true);
    }
  });
  test('role capability matrix aligns to the columns', () => {
    expect(ROLE_CAPS.every((r) => r.caps.length === CAP_COLS.length)).toBe(true);
    expect(ROLE_CAPS.find((r) => r.role === 'Afshin · Owner').caps.every((c) => c === 'full')).toBe(true);
  });
});

describe('asEmailList', () => {
  test('normalises array / comma-string / null with fallback', () => {
    expect(asEmailList(['A@x.com', 'b@x.com'])).toEqual(['a@x.com', 'b@x.com']);
    expect(asEmailList('a@x.com, b@x.com')).toEqual(['a@x.com', 'b@x.com']);
    expect(asEmailList(null, ['d@x.com'])).toEqual(['d@x.com']);
    expect(asEmailList('', ['d@x.com'])).toEqual(['d@x.com']);
  });
});

describe('approvalChainView', () => {
  test('defaults to Sughra (verify) + Faiz (approve), 3-level chain', () => {
    const v = approvalChainView({});
    expect(v.verify).toEqual(['sughra@travkings.com']);
    expect(v.approve).toEqual(['faiz@travkings.com']);
    expect(v.aeCanApprove).toBe(false);
    expect(v.levels.map((l) => l.name)).toEqual(['Check', 'Verify', 'Approve']);
  });

  test('AE-can-approve toggle = Sughra also present in approvers', () => {
    const v = approvalChainView({ approveEmails: ['faiz@travkings.com', 'sughra@travkings.com'] });
    expect(v.aeCanApprove).toBe(true);
  });

  test('master guard OFF => both people INDEPENDENT, no approval required', () => {
    const v = approvalChainView({ flags: { flags: { 'core.policy_guard': { enabled: false } } } });
    expect(v.masterOn).toBe(false);
    expect(v.people.every((p) => p.independent)).toBe(true);
    expect(v.people.find((p) => p.key === 'sughra').status).toMatch(/Independent/);
    expect(v.people.find((p) => p.key === 'faiz').status).toMatch(/Independent/);
  });

  test('master guard ON => both under control', () => {
    const v = approvalChainView({ flags: { flags: { 'core.policy_guard': { enabled: true } } } });
    expect(v.masterOn).toBe(true);
    expect(v.people.every((p) => !p.independent)).toBe(true);
    expect(v.people.find((p) => p.key === 'faiz').status).toBe('Under control');
  });
});
