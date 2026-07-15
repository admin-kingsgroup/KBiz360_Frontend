import { approvalChainView, asEmailList, POWER_SCREENS, POWER_SCREEN_KEYS, DEFAULT_RULES, CONFIGURABLE_GROUPS, CONFIGURABLE_FLAGS, DECLINED_RULES, ROLE_CAPS, CAP_COLS, verifyApproveOverlap, roleControlWarning, policyTest, activeControls, digestSummary } from '../utils/controlPanel';

describe('Control Panel structure', () => {
  test('two rule screens + tools, no master screen', () => {
    expect(POWER_SCREENS.map((g) => g.group)).toEqual(['Rules', 'Enforcement tools', 'Reference & oversight']);
    expect(POWER_SCREEN_KEYS.slice(0, 2)).toEqual(['defaults', 'configurable']);
    expect(POWER_SCREEN_KEYS).not.toContain('master');
    expect(POWER_SCREEN_KEYS).toHaveLength(13);
  });
  test('screen keys are unique and include the tools', () => {
    expect(new Set(POWER_SCREEN_KEYS).size).toBe(POWER_SCREEN_KEYS.length);
    for (const k of ['matrix', 'tester', 'active', 'digest', 'breakglass', 'log']) expect(POWER_SCREEN_KEYS).toContain(k);
  });
  test('DEFAULT_RULES (always-on) carry name + description; include the promoted SoD rules', () => {
    expect(DEFAULT_RULES.length).toBeGreaterThanOrEqual(14);
    expect(DEFAULT_RULES.every((r) => r.nm && r.ds)).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Maker cannot approve their own routed/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Payment prepared/.test(r.nm))).toBe(true);
  });
  test('CONFIGURABLE_GROUPS: every item is a real flag switch; 21 flags across 5 groups', () => {
    expect(CONFIGURABLE_GROUPS.map((g) => g.group)).toEqual(['Approval & Verification', 'Segregation of Duties', 'Access & Export', 'Masters & Locks', 'Data-Entry & Close']);
    CONFIGURABLE_GROUPS.forEach((g) => g.items.forEach((c) => { expect(c.nm && c.ds && c.flag).toBeTruthy(); }));
    expect(CONFIGURABLE_FLAGS).toHaveLength(21);
    expect(new Set(CONFIGURABLE_FLAGS).size).toBe(21);           // no duplicates
    // retired keys are gone; the new masters/sod switches are present
    expect(CONFIGURABLE_FLAGS).not.toContain('core.policy_guard');
    expect(CONFIGURABLE_FLAGS).not.toContain('approval.chain_branch_entries');
    expect(CONFIGURABLE_FLAGS).toEqual(expect.arrayContaining(['masters.creation_lock', 'masters.period_lock', 'sod.verifier_ne_approver']));
  });
  test('DECLINED_RULES lists the four not-adopted controls', () => {
    expect(DECLINED_RULES.map((d) => d.nm)).toEqual(expect.arrayContaining([expect.stringMatching(/2-factor/), expect.stringMatching(/IP \/ location/)]));
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

  test('no role switches => all five roles INDEPENDENT, no approval required', () => {
    const v = approvalChainView({ flags: { flags: {} } });
    expect(v.people).toHaveLength(5);
    expect(v.people.map((p) => p.key)).toEqual(['branch_accountant', 'ae', 'fm', 'director', 'owner']);
    expect(v.people.every((p) => p.independent)).toBe(true);
    expect(v.people.find((p) => p.key === 'ae').status).toMatch(/Independent/);
    expect(v.people.find((p) => p.key === 'fm').status).toMatch(/Independent/);
  });

  test('every role switched on => all five under control', () => {
    const flags = { flags: {} };
    ['branch_accountant', 'ae', 'fm', 'director', 'owner'].forEach((k) => { flags.flags[`control.role.${k}`] = { enabled: true }; });
    const v = approvalChainView({ flags });
    expect(v.people.every((p) => !p.independent)).toBe(true);
    expect(v.people.find((p) => p.key === 'fm').status).toBe('Under control');
  });

  test('a per-role switch brings ONLY that role under control (no master switch anymore)', () => {
    const v = approvalChainView({ flags: { flags: { 'control.role.fm': { enabled: true } } } });
    expect(v.people.find((p) => p.key === 'fm').independent).toBe(false);   // FM switched under control
    expect(v.people.find((p) => p.key === 'ae').independent).toBe(true);    // others still independent
    expect(v.masterOn).toBeUndefined();                                     // master concept removed
  });
});

describe('verifyApproveOverlap (SoD conflict)', () => {
  test('flags an email present in BOTH Verify and Approve', () => {
    expect(verifyApproveOverlap({ verify: ['a@x.com', 'b@x.com'], approve: ['b@x.com', 'c@x.com'] })).toEqual(['b@x.com']);
  });
  test('no overlap → empty; missing lists → empty', () => {
    expect(verifyApproveOverlap({ verify: ['a@x.com'], approve: ['b@x.com'] })).toEqual([]);
    expect(verifyApproveOverlap({})).toEqual([]);
  });
});

describe('roleControlWarning (deadlock guardrail)', () => {
  const dflt = approvalChainView({}); // defaults: 1 verifier (Sughra), 1 approver (Faiz), AE-approve off
  test('FM under control with a sole approver + no AE-approve → cautions', () => {
    expect(roleControlWarning('fm', dflt)).toMatch(/only approver/);
  });
  test('AE under control with a sole verifier → cautions', () => {
    expect(roleControlWarning('ae', dflt)).toMatch(/only verifier/);
  });
  test('no caution once a second approver/verifier exists or AE-approve is on', () => {
    expect(roleControlWarning('fm', { approve: ['faiz@x.com', 'x@x.com'], verify: ['s@x.com'], aeCanApprove: false })).toBeNull();
    expect(roleControlWarning('fm', { approve: ['faiz@x.com'], verify: ['s@x.com'], aeCanApprove: true })).toBeNull();
    expect(roleControlWarning('ae', { verify: ['s@x.com', 'y@x.com'], approve: ['f@x.com'] })).toBeNull();
  });
  test('roles that are neither sole verifier nor approver never caution', () => {
    ['branch_accountant', 'director', 'owner'].forEach((k) => expect(roleControlWarning(k, dflt)).toBeNull());
  });
});

describe('policyTest (Policy Tester)', () => {
  const store = { default: { booking: { enforce: true, threshold: 50000 } }, branches: {} };
  test('Enforcement Matrix routes a booking at/above threshold', () => {
    const r = policyTest({ store, flags: { flags: {} }, branch: 'BOM', rowKey: 'booking', amount: 60000, role: 'ae' });
    expect(r.routed).toBe(true);
    expect(r.reasons[0].rule).toBe('Enforcement Matrix');
  });
  test('below threshold + no role switch → posts directly', () => {
    const r = policyTest({ store, flags: { flags: {} }, branch: 'BOM', rowKey: 'booking', amount: 100, role: 'ae' });
    expect(r.routed).toBe(false);
    expect(r.reasons).toEqual([]);
  });
  test('a per-role switch routes that role regardless of amount', () => {
    const r = policyTest({ store: { default: {}, branches: {} }, flags: { flags: { 'control.role.fm': { enabled: true } } }, branch: 'BOM', rowKey: 'receipt', amount: 1, role: 'fm' });
    expect(r.reasons.some((x) => x.rule === 'Role control')).toBe(true);
  });
  test('owner co-sign routes a refund; a payment is untouched', () => {
    const flags = { flags: { 'approval.owner_cosign_sensitive': { enabled: true } } };
    expect(policyTest({ store: { default: {}, branches: {} }, flags, branch: 'BOM', rowKey: 'refund', amount: 1, role: 'ae' }).reasons.some((x) => x.rule === 'Owner co-sign')).toBe(true);
    expect(policyTest({ store: { default: {}, branches: {} }, flags, branch: 'BOM', rowKey: 'payment', amount: 1, role: 'ae' }).routed).toBe(false);
  });
});

describe('activeControls (digest)', () => {
  test('lists flags ON globally or per-branch, with where', () => {
    const flags = { flags: {
      'core.policy_guard': { enabled: true, scope: 'global', label: 'Master' },
      'entry.mandatory_docs': { enabled: false, branches: { BOM: true }, scope: 'global', label: 'Docs' },
      'reports.log_exports': { enabled: false, label: 'Logs' },
    } };
    const out = activeControls(flags, ['BOM', 'AMD']);
    expect(out.map((a) => a.key)).toEqual(['core.policy_guard', 'entry.mandatory_docs']);   // sorted, ON somewhere
    expect(out.find((a) => a.key === 'core.policy_guard').branchesOn).toEqual(['BOM', 'AMD']); // global → all
    expect(out.find((a) => a.key === 'entry.mandatory_docs').branchesOn).toEqual(['BOM']);     // override only
  });
  test('empty when nothing engaged', () => {
    expect(activeControls({ flags: { x: { enabled: false } } }, ['BOM'])).toEqual([]);
  });
});

describe('digestSummary (Daily Digest)', () => {
  test('extracts pending / exceptions / close from the monitor payloads', () => {
    const d = digestSummary({
      overview: { pendingTotal: 5, oldestPendingDays: 3, lockedPeriods: 2, streamPending: { governance: 4, decision: 1 } },
      integrity: { fails: 2, branches: [{ branch: 'BOM', closeReady: false, fails: 2 }, { branch: 'AMD', closeReady: true, fails: 0 }] },
      inbox: { count: 1 },
    });
    expect(d).toMatchObject({ pending: 5, oldestDays: 3, lockedPeriods: 2, governance: 4, decision: 1, mine: 1, exceptions: 2 });
    expect(d.notCloseReady).toEqual(['BOM']);
    expect(d.closeReady).toBe(false);
  });
  test('empty payloads → zeros, never crashes', () => {
    const d = digestSummary({});
    expect(d).toMatchObject({ pending: 0, exceptions: 0, mine: 0, closeReady: false });
    expect(d.notCloseReady).toEqual([]);
  });
  test('all branches close-ready → closeReady true; fails summed when no top-level count', () => {
    const d = digestSummary({ integrity: { branches: [{ branch: 'BOM', closeReady: true, fails: 0 }, { branch: 'AMD', closeReady: true, fails: 0 }] } });
    expect(d.closeReady).toBe(true);
    expect(d.exceptions).toBe(0);
  });
});
