import { approvalChainView, asEmailList, POWER_SCREENS, POWER_SCREEN_KEYS, DEFAULT_RULES, CONFIGURABLE_GROUPS, CONFIGURABLE_FLAGS, DECLINED_RULES, ROLE_CAPS, CAP_COLS, verifyApproveOverlap, roleControlWarning, policyTest, activeControls, digestSummary, postureGrid, POSTURE_PRESETS, presetChanges, copyBranchChanges, resetBranchChanges, lawBand } from '../utils/controlPanel';
import { RULE_BOOK, ruleBookStats, regroupRegistry, lockedLawBook } from '../utils/ruleBook.data';

describe('posture presets + copy-across-branches (pure)', () => {
  test('presetChanges: covers every configurable flag; preset flags ON, the rest OFF, for the scope', () => {
    const p = POSTURE_PRESETS.find((x) => x.key === 'conservative');
    const ch = presetChanges(p, 'BOM');
    expect(ch).toHaveLength(CONFIGURABLE_FLAGS.length);
    expect(ch.every((c) => c.branch === 'BOM')).toBe(true);
    p.flags.forEach((f) => expect(ch.find((c) => c.key === f).enabled).toBe(true));
    const offKey = CONFIGURABLE_FLAGS.find((f) => !p.flags.includes(f));
    expect(ch.find((c) => c.key === offKey).enabled).toBe(false);
  });
  test('presets nest: conservative ⊂ standard ⊂ strict; strict = all flags', () => {
    const s = Object.fromEntries(POSTURE_PRESETS.map((p) => [p.key, new Set(p.flags)]));
    expect(s.strict.size).toBe(CONFIGURABLE_FLAGS.length);
    [...s.conservative].forEach((f) => expect(s.standard.has(f)).toBe(true));
    [...s.standard].forEach((f) => expect(s.strict.has(f)).toBe(true));
  });
  test('copyBranchChanges: source effective value → each target; source skipped', () => {
    const state = { flags: { 'entry.mandatory_docs': { enabled: false, branches: { BOM: true } } } };
    const ch = copyBranchChanges(state, 'BOM', ['BOM', 'AMD', 'NBO']);
    expect(ch.some((c) => c.branch === 'BOM')).toBe(false);                    // source excluded
    expect(ch.filter((c) => c.branch === 'AMD')).toHaveLength(CONFIGURABLE_FLAGS.length);
    expect(ch.find((c) => c.branch === 'AMD' && c.key === 'entry.mandatory_docs').enabled).toBe(true);  // BOM ON → AMD ON
  });
  test('resetBranchChanges: clears every configurable flag for a branch (enabled:null); no-op on default', () => {
    const ch = resetBranchChanges('BOM');
    expect(ch).toHaveLength(CONFIGURABLE_FLAGS.length);
    expect(ch.every((c) => c.enabled === null && c.branch === 'BOM')).toBe(true);
    expect(resetBranchChanges('default')).toEqual([]);
    expect(resetBranchChanges()).toEqual([]);
  });
});

describe('postureGrid — all-branches bird\'s-eye', () => {
  const codes = ['default', 'BOM', 'AMD'];
  test('grid groups match CONFIGURABLE_GROUPS; every configurable flag has exactly one row', () => {
    const g = postureGrid({ flags: {} }, codes);
    expect(g.map((x) => x.group)).toEqual(CONFIGURABLE_GROUPS.map((x) => x.group));
    expect(g.flatMap((x) => x.rows.map((r) => r.key)).sort()).toEqual([...CONFIGURABLE_FLAGS].sort());
  });
  test('cell.on = effective state; cell.override only for an explicit branch value; default col never override', () => {
    const state = { flags: { 'entry.mandatory_docs': { enabled: true, branches: { AMD: false } } } };
    const row = postureGrid(state, codes).flatMap((x) => x.rows).find((r) => r.key === 'entry.mandatory_docs');
    expect(row.cells.default).toEqual({ on: true, override: false });   // global ON; the default column is never an "override"
    expect(row.cells.BOM).toEqual({ on: true, override: false });        // inherits the global ON
    expect(row.cells.AMD).toEqual({ on: false, override: true });        // explicit branch override → OFF
  });
  test('empty / missing state → every cell off, no overrides', () => {
    const cells = postureGrid(undefined, codes).flatMap((x) => x.rows).flatMap((r) => Object.values(r.cells));
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.on === false && c.override === false)).toBe(true);
  });
});

describe('Control Panel structure', () => {
  test('three governance planes + Oversight, no master screen', () => {
    expect(POWER_SCREENS.map((g) => g.group)).toEqual(['ERP Law', 'Operational Rules', 'Owner & Authority', 'Oversight']);
    // Plane ① is the read-only law screen; plane ② opens with the switch screens.
    expect(POWER_SCREEN_KEYS.slice(0, 3)).toEqual(['defaults', 'configurable', 'grid']);
    expect(POWER_SCREEN_KEYS).not.toContain('master');
    expect(POWER_SCREEN_KEYS).toHaveLength(15);   // +1: Approval Authority converged into plane ③
  });
  test('Approval Authority is converged into plane ③ (Owner & Authority)', () => {
    const auth = POWER_SCREENS.find((g) => g.group === 'Owner & Authority');
    expect(auth.items.map((i) => i.key)).toContain('authority');
    expect(auth.items.find((i) => i.key === 'authority').label).toBe('Approval Authority');
  });
  test('screen keys are unique and include the tools', () => {
    expect(new Set(POWER_SCREEN_KEYS).size).toBe(POWER_SCREEN_KEYS.length);
    for (const k of ['matrix', 'tester', 'active', 'digest', 'breakglass', 'log']) expect(POWER_SCREEN_KEYS).toContain(k);
  });
});

describe('ERP Law band (plane ① · pure roll-up)', () => {
  test('lawBand rolls the Rule Book into Accounts / Operations domain counts, totals derived', () => {
    const b = lawBand(RULE_BOOK);
    const stats = ruleBookStats(RULE_BOOK);
    // Totals are derived from the registry, never hand-typed — so they can't drift.
    expect(b.totals.all).toBe(stats.total);
    expect(b.totals.accounts).toBe(stats.accounts);
    expect(b.totals.ops).toBe(stats.ops);
    expect(b.totals.domains).toBe(stats.domains);
    // Every domain lands in exactly one track; row counts sum back to the group totals.
    expect(b.accounts.length + b.ops.length).toBe(RULE_BOOK.length);
    expect(b.accounts.reduce((n, r) => n + r.count, 0)).toBe(b.totals.accounts);
    expect(b.ops.every((r) => r.id && r.title && typeof r.count === 'number')).toBe(true);
  });
  test('lawBand reads a live /api/rules registry identically to the bundled book (via regroupRegistry)', () => {
    // Simulate a flat registry payload → regroup → band; counts must match the same items.
    const items = [
      { domainCode: 'GST', domain: 'A', group: 'accounts', domainTitle: 'Taxation — GST', title: 'r1', sourceRef: 'x:1' },
      { domainCode: 'GST', domain: 'A', group: 'accounts', domainTitle: 'Taxation — GST', title: 'r2', sourceRef: 'x:2' },
      { domainCode: 'APPR', domain: 'Q', group: 'ops', domainTitle: 'Approval Chain', title: 'r3', sourceRef: 'y:1' },
    ];
    const b = lawBand(regroupRegistry(items));
    expect(b.totals.all).toBe(3);
    expect(b.totals.accounts).toBe(2);
    expect(b.totals.ops).toBe(1);
    expect(b.accounts[0]).toMatchObject({ id: 'GST', count: 2 });
  });
  test('lawBand is safe on an empty book', () => {
    expect(lawBand([]).totals).toEqual({ accounts: 0, ops: 0, all: 0, domains: 0 });
    expect(lawBand().totals.all).toBe(0);
  });
  test('lockedLawBook keeps only govern:locked laws — owner-set rules drop to plane ③', () => {
    const items = [
      { domainCode: 'GST', group: 'accounts', domainTitle: 'Tax', govern: 'locked', title: 'a', sourceRef: 'x:1' },
      { domainCode: 'GST', group: 'accounts', domainTitle: 'Tax', govern: 'locked', title: 'b', sourceRef: 'x:2' },
      { domainCode: 'APPR', group: 'ops', domainTitle: 'Approval authority', govern: 'owner', title: 'who verifies', sourceRef: 'y:1' },
    ];
    const band = lawBand(lockedLawBook(items));
    expect(band.totals.all).toBe(2);          // the owner-set APPR who-rule is excluded
    expect(band.totals.accounts).toBe(2);
    expect(band.ops.length).toBe(0);          // its only ops domain was entirely owner-governed
  });
  test('lockedLawBook never blanks the band: regroups all when no govern tag, bundled when empty', () => {
    const noGovern = [{ domainCode: 'GST', group: 'accounts', domainTitle: 'Tax', title: 'a', sourceRef: 'x:1' }];
    expect(lockedLawBook(noGovern).length).toBe(1);   // older BE: fall back to all items, not blank
    expect(lockedLawBook(undefined)).toBe(RULE_BOOK); // offline: bundled fallback
    expect(lockedLawBook([])).toBe(RULE_BOOK);
  });
  test('DEFAULT_RULES (always-on) carry name + description; include SoD + the DB-enforced invariants', () => {
    expect(DEFAULT_RULES.length).toBeGreaterThanOrEqual(44);   // 16 base + 13 audited + 4 lifecycle + 12 authority gates
    expect(DEFAULT_RULES.every((r) => r.nm && r.ds)).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Maker cannot approve their own routed/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Payment prepared/.test(r.nm))).toBe(true);
    // the newly-surfaced always-on backend invariants
    expect(DEFAULT_RULES.some((r) => /balanced \(Dr = Cr\)/.test(r.nm))).toBe(true);          // U-01
    expect(DEFAULT_RULES.some((r) => /immutable/.test(r.nm))).toBe(true);                      // VOU-03
    expect(DEFAULT_RULES.some((r) => /refund.s original must resolve/i.test(r.nm))).toBe(true); // RF-01
    expect(DEFAULT_RULES.some((r) => /Branch isolation/.test(r.nm))).toBe(true);
    // the 4 lifecycle/access invariants just added
    expect(DEFAULT_RULES.some((r) => /Master-locked voucher legs/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /INB deal is controlled end-to-end/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Linked SO\/PO\/GP pair/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Login & password-change integrity/.test(r.nm))).toBe(true);
    // the always-on AUTHORITY gates (who may act) — the list described mechanics only before
    expect(DEFAULT_RULES.some((r) => /Deleting or reversing posted entries/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Revoke and inter-branch push are approver-only/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Control config is read by TK Group Central/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Rules Managers and delegation are the Owner/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Reconciliation authority follows the tier/.test(r.nm))).toBe(true);
    expect(DEFAULT_RULES.some((r) => /Control-plane masters are admin-only/.test(r.nm))).toBe(true);
    // the Super Admin chain override must be stated — the maker rule overstated without it
    expect(DEFAULT_RULES.find((r) => /Maker cannot approve/.test(r.nm)).ds).toMatch(/Super Admin overrides/);
  });
  test('CONFIGURABLE_GROUPS: every item is a real flag switch; 21 flags across 5 groups', () => {
    expect(CONFIGURABLE_GROUPS.map((g) => g.group)).toEqual(['Approval & Verification', 'Segregation of Duties', 'Access & Export', 'Masters & Locks', 'Data-Entry & Close']);
    CONFIGURABLE_GROUPS.forEach((g) => g.items.forEach((c) => { expect(c.nm && c.ds && c.flag).toBeTruthy(); }));
    expect(CONFIGURABLE_FLAGS).toHaveLength(21);
    expect(new Set(CONFIGURABLE_FLAGS).size).toBe(21);           // no duplicates
    // retired keys are gone; the new masters/sod switches are present
    expect(CONFIGURABLE_FLAGS).not.toContain('core.policy_guard');
    expect(CONFIGURABLE_FLAGS).not.toContain('approval.chain_branch_entries');
    expect(CONFIGURABLE_FLAGS).not.toContain('approval.owner_cosign_sensitive'); // retired 2026-07
    // A key the BACKEND catalogue no longer knows would 422 every bulk write (set-many
    // validates the whole batch up front), silently breaking Enable-all, every posture
    // preset, copy-branch and reset-branch. Pin the retirement here.
    expect(CONFIGURABLE_FLAGS).not.toContain('approval.ae_can_approve'); // retired 2026-07
    expect(CONFIGURABLE_FLAGS).toEqual(expect.arrayContaining(['masters.creation_lock', 'masters.period_lock', 'sod.verifier_ne_approver']));
    // the per-role switches cover all seven roles (BM / GM have their own — no BA fold-in)
    expect(CONFIGURABLE_FLAGS).toEqual(expect.arrayContaining(['control.role.branch_manager', 'control.role.general_manager']));
  });

  // The Branch Accountant switch does far more than route entries — it stops the accountant
  // raising the four CRM-sourced documents. A card that only said "walks the approval chain"
  // would understate what the Owner is turning on, and the refund gap must be stated: the
  // CRM cannot raise refunds, so engaging this leaves them with no route in.
  test('the Branch Accountant card states the creation block AND the refund caution', () => {
    const card = CONFIGURABLE_GROUPS[0].items.find((i) => i.flag === 'control.role.branch_accountant');
    expect(card.ds).toMatch(/no longer create an SO\/PO\/GP/i);
    expect(card.ds).toMatch(/inter-branch deal, a refund or a reissue/i);
    expect(card.ds).toMatch(/CAUTION/);
    expect(card.ds).toMatch(/nobody in the branch can raise a refund/i);
    expect(card.crit).toBe(true);   // money/critical accent — it can stop a branch working
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

  test('the AE approves only when EXPLICITLY named in the approver list', () => {
    const v = approvalChainView({ approveEmails: ['faiz@travkings.com', 'sughra@travkings.com'] });
    expect(v.aeCanApprove).toBe(true);
  });

  // The retired switch must not resurrect the elevation from a stale config value: the live
  // 'tkflags' was left with this flag ON across every branch by the old
  // set-ae-independent-approval script, and the backend now ignores it entirely.
  test('a STALE approval.ae_can_approve flag no longer makes the AE an approver', () => {
    const v = approvalChainView({ flags: { flags: { 'approval.ae_can_approve': { enabled: true } } } });
    expect(v.aeCanApprove).toBe(false);
    expect(v.people.find((p) => p.key === 'ae').extra).toBe('');
  });

  test('no role switches => all seven roles INDEPENDENT, no approval required', () => {
    const v = approvalChainView({ flags: { flags: {} } });
    expect(v.people).toHaveLength(7);
    expect(v.people.map((p) => p.key)).toEqual(['branch_accountant', 'ae', 'fm', 'branch_manager', 'general_manager', 'director', 'owner']);
    expect(v.people.every((p) => p.independent)).toBe(true);
    expect(v.people.find((p) => p.key === 'ae').status).toMatch(/Independent/);
    expect(v.people.find((p) => p.key === 'fm').status).toMatch(/Independent/);
  });

  test('every role switched on => all seven under control', () => {
    const flags = { flags: {} };
    ['branch_accountant', 'ae', 'fm', 'branch_manager', 'general_manager', 'director', 'owner'].forEach((k) => { flags.flags[`control.role.${k}`] = { enabled: true }; });
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
  const dflt = approvalChainView({}); // defaults: 1 verifier (Sughra), 1 approver (Faiz)
  test('FM under control with a sole approver → cautions', () => {
    expect(roleControlWarning('fm', dflt)).toMatch(/only approver/);
    // The retired AE-approve switch must not be offered as the way out any more.
    expect(roleControlWarning('fm', dflt)).not.toMatch(/Let Sughra also Approve/);
  });
  test('AE under control with a sole verifier → cautions', () => {
    expect(roleControlWarning('ae', dflt)).toMatch(/only verifier/);
  });
  test('no caution once a second approver/verifier exists, or the AE is named an approver', () => {
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
