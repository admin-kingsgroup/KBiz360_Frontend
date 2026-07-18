// FE mirror of the backend approval chain — which button a user may press at each stage.
// The server enforces everything; these helpers only decide what to SHOW. But a button that
// renders enabled and then 403s is a live no-op, so the mirror must match the backend gates.
//
// nextActionFor / flagOn are pure, but the module imports ./api (which reads import.meta.env,
// unparseable by Jest) and react-query. Stub both — neither is on the path under test.
jest.mock('../api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => '') }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn(() => ({ data: null })) }));

import { nextActionFor, flagOn } from '../approvalChain';

const BA_FLAG = 'control.role.branch_accountant';
const cfgOf = (flags = {}) => ({
  verify: ['sughra@travkings.com'],
  approve: ['faiz@travkings.com'],
  director: ['farhan@travkings.com'],
  owner: ['afshin.dhanani@kingsgroupco.com'],
  flags,
});

const ba = { email: 'ap@travkings.com', role: 'Branch Accountant' };
const sughra = { email: 'sughra@travkings.com', role: 'Sr. Accounts Executive' };
const faiz = { email: 'faiz@travkings.com', name: 'Faiz', role: 'Senior Finance Manager' };  // name matters: the runtime stamps NAME
const owner = { email: 'afshin.dhanani@kingsgroupco.com', role: 'Owner' };
const su = { email: 'root@x.com', role: 'Super Admin' };

const atCheck = { reviewStage: 'check', branch: 'BOM', checkedBy: '' };

describe('flagOn (branch-wise mirror of backend isEnabled)', () => {
  test('unknown flag → OFF (dormant, fail-safe)', () => {
    expect(flagOn({}, BA_FLAG, 'BOM')).toBe(false);
    expect(flagOn(undefined, BA_FLAG, 'BOM')).toBe(false);
  });
  test('global enabled applies to every branch', () => {
    expect(flagOn({ [BA_FLAG]: { enabled: true } }, BA_FLAG, 'NBO')).toBe(true);
  });
  test('an explicit per-branch override beats the global value, both ways', () => {
    const on = { [BA_FLAG]: { enabled: false, branches: { BOM: true } } };
    expect(flagOn(on, BA_FLAG, 'BOM')).toBe(true);
    expect(flagOn(on, BA_FLAG, 'NBO')).toBe(false);
    const off = { [BA_FLAG]: { enabled: true, branches: { BOM: false } } };
    expect(flagOn(off, BA_FLAG, 'BOM')).toBe(false);
    expect(flagOn(off, BA_FLAG, 'NBO')).toBe(true);
  });
  test('foundation is always on', () => {
    expect(flagOn({ [BA_FLAG]: { foundation: true, enabled: false } }, BA_FLAG, 'BOM')).toBe(true);
  });
});

describe('nextActionFor · entries outside the chain', () => {
  test('no reviewStage → the original single-step Approve, open to everyone', () => {
    expect(nextActionFor({ branch: 'BOM' }, cfgOf(), ba)).toMatchObject({ action: 'approve', allowed: true });
  });
});

describe('nextActionFor · Check (level 1)', () => {
  test('DORMANT by default: anyone with branch access may Check — unchanged behaviour', () => {
    for (const who of [ba, sughra, faiz, owner]) {
      expect(nextActionFor(atCheck, cfgOf(), who)).toMatchObject({ action: 'check', allowed: true });
    }
  });

  test('engaged: the Branch Accountant may Check', () => {
    const r = nextActionFor(atCheck, cfgOf({ [BA_FLAG]: { enabled: true } }), ba);
    expect(r).toMatchObject({ action: 'check', allowed: true });
    expect(r.hint).toMatch(/your step as Branch Accountant/);
  });

  test('engaged: the verifier and the FM may NOT Check, and the hint says whose step it is', () => {
    const cfg = cfgOf({ [BA_FLAG]: { enabled: true } });
    for (const who of [sughra, faiz]) {
      const r = nextActionFor(atCheck, cfg, who);
      expect(r.allowed).toBe(false);
      expect(r.hint).toMatch(/the Branch Accountant’s step/);
    }
  });

  test('engaged: the Owner and a Super Admin keep the override', () => {
    const cfg = cfgOf({ [BA_FLAG]: { enabled: true } });
    expect(nextActionFor(atCheck, cfg, owner).allowed).toBe(true);
    expect(nextActionFor(atCheck, cfg, su).allowed).toBe(true);
  });

  test('engaged for BOM only → an NBO entry stays open to anyone', () => {
    const cfg = cfgOf({ [BA_FLAG]: { enabled: false, branches: { BOM: true } } });
    expect(nextActionFor({ ...atCheck, branch: 'BOM' }, cfg, sughra).allowed).toBe(false);
    expect(nextActionFor({ ...atCheck, branch: 'NBO' }, cfg, sughra).allowed).toBe(true);
  });

  test('a missing flags map never blocks (matches the useApprovalChain fallback)', () => {
    expect(nextActionFor(atCheck, { verify: [], approve: [] }, sughra).allowed).toBe(true);
  });
});

describe('nextActionFor · Verify / Approve are unchanged by the Branch Accountant rule', () => {
  const cfg = cfgOf({ [BA_FLAG]: { enabled: true } });
  test('Verify stays the configured verifier’s (or Super Admin’s)', () => {
    const e = { reviewStage: 'verify', branch: 'BOM', checkedBy: 'ap' };
    expect(nextActionFor(e, cfg, sughra).allowed).toBe(true);
    expect(nextActionFor(e, cfg, su).allowed).toBe(true);
    expect(nextActionFor(e, cfg, ba).allowed).toBe(false);
    expect(nextActionFor(e, cfg, faiz).allowed).toBe(false);
  });
  test('Approve stays the configured approver’s — the AE cannot approve', () => {
    const e = { reviewStage: 'approve', branch: 'BOM', checkedBy: 'ap', verifiedBy: 'sughra@travkings.com' };
    expect(nextActionFor(e, cfg, faiz)).toMatchObject({ action: 'approve', allowed: true });
    expect(nextActionFor(e, cfg, sughra).allowed).toBe(false);
    expect(nextActionFor(e, cfg, ba).allowed).toBe(false);
  });
});

// Mirror of the server gate shared/approvalChain.assertFinalApprove. The button must NOT render
// enabled then 403. CRITICAL: the server stamps checkedBy/verifiedBy/submittedBy with labelOf =
// the display NAME at runtime, not the email — so these must match by NAME too (email-only was
// the original bug: the block was inert for every name-stamped entry).
describe('nextActionFor · Approve mirrors the SoD gates by identity (name OR email — no stale-UI 403)', () => {
  test('the approver who is the maker is blocked whether the entry stamped their NAME or email; Super Admin still may', () => {
    for (const stamp of ['Faiz', 'faiz@travkings.com']) {   // runtime stamps the NAME; email also tolerated
      const e = { reviewStage: 'approve', branch: 'BOM', checkedBy: 'ap', verifiedBy: 'sughra@travkings.com', submittedBy: stamp };
      const r = nextActionFor(e, cfgOf(), faiz);
      expect(r.allowed).toBe(false);
      expect(r.hint).toMatch(/maker/i);
    }
    const e = { reviewStage: 'approve', branch: 'BOM', checkedBy: 'ap', verifiedBy: 'sughra@travkings.com', submittedBy: 'Faiz' };
    expect(nextActionFor(e, cfgOf(), su).allowed).toBe(true);   // Super Admin override, mirrors BE isSuper
  });

  test('with verifier ≠ approver engaged, the prior verifier is blocked by NAME stamp too', () => {
    const sodCfg = cfgOf({ 'sod.verifier_ne_approver': { enabled: true } });
    sodCfg.verify = ['faiz@travkings.com']; sodCfg.approve = ['faiz@travkings.com']; // the overlap the panel warns about
    for (const stamp of ['Faiz', 'faiz@travkings.com']) {
      const e = { reviewStage: 'approve', branch: 'BOM', checkedBy: 'ap', verifiedBy: stamp, submittedBy: 'ap@travkings.com' };
      const r = nextActionFor(e, sodCfg, faiz);
      expect(r.allowed).toBe(false);
      expect(r.hint).toMatch(/verifier/i);
    }
  });

  test('the SoD flag OFF → a verifier-also-approver may approve (no phantom block)', () => {
    const cfg = cfgOf(); // sod flag absent
    cfg.verify = ['faiz@travkings.com']; cfg.approve = ['faiz@travkings.com'];
    const e = { reviewStage: 'approve', branch: 'BOM', checkedBy: 'ap', verifiedBy: 'Faiz', submittedBy: 'ap@travkings.com' };
    expect(nextActionFor(e, cfg, faiz).allowed).toBe(true);
  });

  test('a non-maker configured approver approves normally', () => {
    const e = { reviewStage: 'approve', branch: 'BOM', checkedBy: 'ap', verifiedBy: 'Sughra', submittedBy: 'ap@travkings.com' };
    expect(nextActionFor(e, cfgOf(), faiz).allowed).toBe(true);
  });
});
